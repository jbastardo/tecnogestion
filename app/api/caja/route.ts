import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { OdooService } from '@/lib/odoo';

const prisma = new PrismaClient();

const odoo = new OdooService({
  url: process.env.ODOO_URL || 'https://www.onprotec.shop',
  db: process.env.ODOO_DB || 'binaural-dev-onprotec-16-release-8815487',
  username: process.env.ODOO_USERNAME || 'juan@onprotec.com',
  password: process.env.ODOO_PASSWORD || '47028d0d8c58c126b1e9276bec43158fc0c7ee41',
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cajaId = searchParams.get('cajaId') || 'boveda';
    const action = searchParams.get('action'); // 'resumen', 'movimientos', 'cuadres'
    const fechaInicio = searchParams.get('inicio');
    const fechaFin = searchParams.get('fin');
    
    // --- LÓGICA PARA CAJAS ODOO (POS) ---
    if (cajaId.startsWith('odoo_')) {
      const config_id = parseInt(cajaId.split('_')[1]);
      
      if (action === 'resumen') {
        const sessions = await odoo.searchRead(
          'pos.session',
          [['config_id', '=', config_id]],
          ['name', 'state', 'start_at', 'stop_at', 'cash_register_balance_start', 'cash_register_balance_end_real', 'cash_register_difference'],
          0, 1,
          'id desc'
        );
        const cajaAbierta = sessions[0];
        if (!cajaAbierta) {
           return NextResponse.json({ estado: 'CERRADA', cajaActiva: null, resumen: null });
        }

        const isAbierta = cajaAbierta.state === 'opened' || cajaAbierta.state === 'closing_control';
        
        const payments = await odoo.searchRead('pos.payment', [['session_id', '=', cajaAbierta.id]], ['amount', 'payment_method_id']);
        
        let ingresosUsd = 0;
        let ingresosBs = 0;
        let egresosUsd = 0;
        let egresosBs = 0;
        
        payments.forEach((p: any) => {
           const method = p.payment_method_id && p.payment_method_id[1] ? p.payment_method_id[1].toLowerCase() : '';
           const isUsd = method.includes('dolar') || method.includes('usd') || method.includes('divisa') || method.includes('zelle') || method.includes('binance') || method.includes('usdt');
           if (isUsd) {
              if (p.amount > 0) ingresosUsd += p.amount;
              else egresosUsd += Math.abs(p.amount);
           } else {
              if (p.amount > 0) ingresosBs += p.amount;
              else egresosBs += Math.abs(p.amount);
           }
        });

        return NextResponse.json({
          estado: isAbierta ? 'ABIERTA' : 'CERRADA',
          cajaAbierta: {
            saldoAperturaBs: cajaAbierta.cash_register_balance_start || 0,
            saldoAperturaUsd: 0,
            fechaApertura: cajaAbierta.start_at,
          },
          resumen: {
            ingresosUsd, egresosUsd, ingresosBs, egresosBs,
            saldoActualUsd: ingresosUsd - egresosUsd,
            saldoActualBs: (cajaAbierta.cash_register_balance_start || 0) + ingresosBs - egresosBs,
          }
        });
      }

      if (action === 'movimientos') {
        const domain: any[] = [['config_id', '=', config_id]];
        if (fechaInicio && fechaFin) {
            domain.push(['start_at', '>=', fechaInicio + ' 00:00:00']);
            domain.push(['start_at', '<=', fechaFin + ' 23:59:59']);
        }
        const sessions = await odoo.searchRead('pos.session', domain, ['id'], 0, 50, 'id desc');
        if (!sessions.length) return NextResponse.json({ movimientos: [] });
        const sessionIds = sessions.map((s: any) => s.id);
        const payments = await odoo.searchRead('pos.payment', [['session_id', 'in', sessionIds]], ['amount', 'payment_method_id', 'payment_date', 'pos_order_id']);
        
        const movimientos = payments.map((p: any) => {
           const method = p.payment_method_id && p.payment_method_id[1] ? p.payment_method_id[1].toLowerCase() : '';
           const isUsd = method.includes('dolar') || method.includes('usd') || method.includes('divisa') || method.includes('zelle') || method.includes('binance') || method.includes('usdt');
           return {
              id: p.id,
              fecha: p.payment_date,
              concepto: `Orden ${p.pos_order_id ? p.pos_order_id[1] : ''} - ${p.payment_method_id ? p.payment_method_id[1] : ''}`,
              montoUsd: isUsd ? Math.abs(p.amount) : 0,
              montoBs: !isUsd ? Math.abs(p.amount) : 0,
              tipo: p.amount >= 0 ? 'INGRESO' : 'EGRESO'
           };
        });
        return NextResponse.json({ movimientos });
      }

      if (action === 'cuadres') {
        const domain: any[] = [['config_id', '=', config_id], ['state', '=', 'closed']];
        if (fechaInicio && fechaFin) {
            domain.push(['stop_at', '>=', fechaInicio + ' 00:00:00']);
            domain.push(['stop_at', '<=', fechaFin + ' 23:59:59']);
        }
        const sessions = await odoo.searchRead(
          'pos.session',
          domain,
          ['name', 'state', 'start_at', 'stop_at', 'cash_register_balance_start', 'cash_register_balance_end_real', 'cash_register_difference'],
          0, 50,
          'stop_at desc'
        );
        const cuadres = sessions.map((s: any) => ({
          id: s.id,
          fechaApertura: s.start_at,
          fechaCierre: s.stop_at,
          saldoFisicoUsd: 0,
          saldoSistemaUsd: 0,
          saldoFisicoBs: s.cash_register_balance_end_real,
          saldoSistemaBs: (s.cash_register_balance_end_real || 0) - (s.cash_register_difference || 0),
          observaciones: `Sesión: ${s.name}`,
        }));
        return NextResponse.json({ cuadres });
      }
    }

    // --- LÓGICA PARA BANCOS/DIARIOS ODOO ---
    if (cajaId.startsWith('journal_')) {
      const journal_id = parseInt(cajaId.split('_')[1]);
      
      if (action === 'resumen') {
         const journal = await odoo.searchRead('account.journal', [['id', '=', journal_id]], ['name', 'default_account_id', 'currency_id']);
         if (!journal.length) return NextResponse.json({ estado: 'CERRADA', cajaActiva: null, resumen: null });
         
         const j = journal[0];
         let balance = 0;
         let ingresos = 0;
         let egresos = 0;
         
         if (j.default_account_id) {
             const sum = await odoo.executeKw('account.move.line', 'read_group', [
                 [['account_id', '=', j.default_account_id[0]], ['parent_state', '=', 'posted']],
                 ['debit', 'credit'],
                 ['account_id']
             ]);
             if (sum && sum.length > 0) {
                 ingresos = sum[0].debit || 0;
                 egresos = sum[0].credit || 0;
                 balance = ingresos - egresos;
             }
         }
         
         const isUsd = j.currency_id && j.currency_id[1] && j.currency_id[1].includes('USD');
         
         return NextResponse.json({
            estado: 'ABIERTA',
            cajaAbierta: {
              saldoAperturaBs: 0,
              saldoAperturaUsd: 0,
              fechaApertura: 'Siempre Activa',
            },
            resumen: {
              ingresosUsd: isUsd ? ingresos : 0, 
              egresosUsd: isUsd ? egresos : 0, 
              ingresosBs: !isUsd ? ingresos : 0, 
              egresosBs: !isUsd ? egresos : 0,
              saldoActualUsd: isUsd ? balance : 0,
              saldoActualBs: !isUsd ? balance : 0,
            }
         });
      }

      if (action === 'movimientos') {
         const journal = await odoo.searchRead('account.journal', [['id', '=', journal_id]], ['default_account_id', 'currency_id']);
         if (!journal.length || !journal[0].default_account_id) return NextResponse.json({ movimientos: [] });
         
         const isUsd = journal[0].currency_id && journal[0].currency_id[1] && journal[0].currency_id[1].includes('USD');
         
         let domain: any[] = [['account_id', '=', journal[0].default_account_id[0]], ['parent_state', '=', 'posted']];
         if (fechaInicio && fechaFin) {
            domain.push(['date', '>=', fechaInicio]);
            domain.push(['date', '<=', fechaFin]);
         }
         
         const lines = await odoo.searchRead('account.move.line', domain, ['date', 'name', 'ref', 'debit', 'credit'], 0, 100, 'date desc, id desc');
         
         const movimientos = lines.map((l: any) => {
            const monto = (l.debit || 0) - (l.credit || 0);
            return {
               id: l.id,
               fecha: l.date,
               concepto: `${l.ref || ''} ${l.name || ''}`.trim(),
               montoUsd: isUsd ? Math.abs(monto) : 0,
               montoBs: !isUsd ? Math.abs(monto) : 0,
               tipo: monto >= 0 ? 'INGRESO' : 'EGRESO'
            };
         });
         
         return NextResponse.json({ movimientos });
      }

      if (action === 'cuadres') {
         return NextResponse.json({ cuadres: [] });
      }
    }

    // --- LÓGICA PARA CAJAS LOCALES (PRISMA) ---
    // Obtener la caja activa del día o la última abierta
    const cajaAbierta = await prisma.aperturaCierreCaja.findFirst({
      where: { cajaId, estado: 'ABIERTA' },
      orderBy: { fechaApertura: 'desc' }
    });

    if (action === 'resumen') {
      if (!cajaAbierta) {
        return NextResponse.json({
          estado: 'CERRADA',
          cajaActiva: null,
          resumen: null
        });
      }

      // Sumar ingresos y egresos de la caja abierta
      const movimientos = await prisma.movimientoCaja.findMany({
        where: {
          cajaId,
          fecha: { gte: cajaAbierta.fechaApertura }
        }
      });

      const ingresosUsd = movimientos.filter(m => m.tipo === 'INGRESO').reduce((acc, m) => acc + m.montoUsd, 0);
      const egresosUsd = movimientos.filter(m => m.tipo === 'EGRESO').reduce((acc, m) => acc + m.montoUsd, 0);
      
      const ingresosBs = movimientos.filter(m => m.tipo === 'INGRESO').reduce((acc, m) => acc + m.montoBs, 0);
      const egresosBs = movimientos.filter(m => m.tipo === 'EGRESO').reduce((acc, m) => acc + m.montoBs, 0);

      const saldoActualUsd = cajaAbierta.saldoAperturaUsd + ingresosUsd - egresosUsd;
      const saldoActualBs = cajaAbierta.saldoAperturaBs + ingresosBs - egresosBs;

      return NextResponse.json({
        estado: 'ABIERTA',
        cajaAbierta,
        resumen: {
          ingresosUsd,
          egresosUsd,
          ingresosBs,
          egresosBs,
          saldoActualUsd,
          saldoActualBs
        }
      });
    }

    if (action === 'movimientos') {
      const whereClause: any = { cajaId };
      if (fechaInicio && fechaFin) {
         whereClause.fecha = {
            gte: new Date(fechaInicio + 'T00:00:00.000Z'),
            lte: new Date(fechaFin + 'T23:59:59.999Z')
         };
      }
      const movimientos = await prisma.movimientoCaja.findMany({
        where: whereClause,
        orderBy: { fecha: 'desc' },
        take: 100
      });
      return NextResponse.json({ movimientos });
    }

    if (action === 'cuadres') {
      const whereClause: any = { cajaId, estado: 'CERRADA' };
      if (fechaInicio && fechaFin) {
         whereClause.fechaCierre = {
            gte: new Date(fechaInicio + 'T00:00:00.000Z'),
            lte: new Date(fechaFin + 'T23:59:59.999Z')
         };
      }
      const cuadres = await prisma.aperturaCierreCaja.findMany({
        where: whereClause,
        orderBy: { fechaCierre: 'desc' },
        take: 50
      });
      return NextResponse.json({ cuadres });
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });

  } catch (error: any) {
    console.error("Error leyendo caja:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, cajaId } = body;

    if (cajaId.startsWith('odoo_')) {
      return NextResponse.json({ error: 'No se puede modificar una caja POS de Odoo desde aquí' }, { status: 400 });
    }

    if (action === 'apertura') {
      // Verificar que no haya una caja abierta
      const cajaAbierta = await prisma.aperturaCierreCaja.findFirst({
        where: { cajaId, estado: 'ABIERTA' }
      });
      if (cajaAbierta) {
        return NextResponse.json({ error: 'La caja ya está abierta' }, { status: 400 });
      }

      const nuevaCaja = await prisma.aperturaCierreCaja.create({
        data: {
          cajaId,
          saldoAperturaUsd: parseFloat(body.saldoAperturaUsd || 0),
          saldoAperturaBs: parseFloat(body.saldoAperturaBs || 0),
          estado: 'ABIERTA'
        }
      });
      return NextResponse.json({ success: true, caja: nuevaCaja });
    }

    if (action === 'movimiento') {
      const nuevoMovimiento = await prisma.movimientoCaja.create({
        data: {
          cajaId,
          tipo: body.tipo, // INGRESO o EGRESO
          concepto: body.concepto,
          montoUsd: parseFloat(body.montoUsd || 0),
          montoBs: parseFloat(body.montoBs || 0),
          fecha: body.fecha ? new Date(body.fecha + 'T12:00:00.000Z') : new Date(),
        }
      });
      return NextResponse.json({ success: true, movimiento: nuevoMovimiento });
    }

    if (action === 'cierre') {
      const cajaAbierta = await prisma.aperturaCierreCaja.findFirst({
        where: { cajaId, estado: 'ABIERTA' },
        orderBy: { fechaApertura: 'desc' }
      });

      if (!cajaAbierta) {
        return NextResponse.json({ error: 'No hay ninguna caja abierta' }, { status: 400 });
      }

      const cierre = await prisma.aperturaCierreCaja.update({
        where: { id: cajaAbierta.id },
        data: {
          estado: 'CERRADA',
          fechaCierre: new Date(),
          saldoFisicoUsd: parseFloat(body.saldoFisicoUsd || 0),
          saldoFisicoBs: parseFloat(body.saldoFisicoBs || 0),
          saldoSistemaUsd: parseFloat(body.saldoSistemaUsd || 0),
          saldoSistemaBs: parseFloat(body.saldoSistemaBs || 0),
          observaciones: body.observaciones || ""
        }
      });
      return NextResponse.json({ success: true, cierre });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error("Error operando caja:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
