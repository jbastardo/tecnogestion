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
    const fechaInicio = searchParams.get('inicio') || new Date().toISOString().split('T')[0];
    const fechaFin = searchParams.get('fin') || new Date().toISOString().split('T')[0];
    const moneda = searchParams.get('moneda') || 'USD'; // Bs o USD

    // 1. VENTAS (Odoo - pos.order y account.move.line para CXC)
    const posOrders = await odoo.searchRead(
      'pos.order',
      [['date_order', '>=', fechaInicio + ' 00:00:00'], ['date_order', '<=', fechaFin + ' 23:59:59'], ['state', 'in', ['paid', 'done', 'invoiced']]],
      ['name', 'amount_total', 'amount_tax', 'session_id', 'state', 'account_move']
    );

    const moveIds = posOrders.map((o: any) => o.account_move && o.account_move[0]).filter(Boolean);
    let moveJournals: any = {};
    if (moveIds.length > 0) {
      const moves = await odoo.searchRead(
        'account.move',
        [['id', 'in', moveIds]],
        ['journal_id']
      );
      moves.forEach((m: any) => {
        moveJournals[m.id] = m.journal_id && m.journal_id[1] ? m.journal_id[1].toLowerCase() : '';
      });
    }

    let totalVentas = 0;
    let totalImpuestos = 0;
    let totalFacturado = 0;
    let totalNotasDeVenta = 0;
    
    posOrders.forEach((order: any) => {
      totalVentas += order.amount_total;
      totalImpuestos += order.amount_tax;
      
      const moveId = order.account_move && order.account_move[0];
      const journalName = moveId ? (moveJournals[moveId] || '') : '';
      
      if (journalName.includes('factura')) {
        totalFacturado += order.amount_total;
      } else {
        totalNotasDeVenta += order.amount_total;
      }
    });

    const cuentasClave = ['1122001', '1122007', '1141001', '1141003'];

    const cxcLines = await odoo.searchRead(
      'account.move.line',
      [
        ['account_id.code', 'in', cuentasClave], 
        ['parent_state', '=', 'posted'], 
        ['amount_residual', '!=', 0],
        ['date', '>=', fechaInicio],
        ['date', '<=', fechaFin]
      ],
      ['amount_residual', 'amount_residual_currency', 'currency_id']
    );
    const totalCXC = cxcLines.reduce((acc: any, line: any) => {
      const currName = line.currency_id && line.currency_id[1] ? line.currency_id[1] : 'VES';
      
      if (currName === 'USD' && line.amount_residual_currency) {
         acc.usd += line.amount_residual_currency;
      } else {
         acc.ves += line.amount_residual || 0;
      }
      return acc;
    }, { usd: 0, ves: 0 });

    // 2 & 3. COMPRAS Y GASTOS ODOO (account.move)
    const comprasOdoo = await odoo.searchRead(
      'account.move',
      [['move_type', 'in', ['in_invoice', 'in_receipt']], ['invoice_date', '>=', fechaInicio], ['invoice_date', '<=', fechaFin], ['state', '=', 'posted']],
      ['amount_total', 'amount_tax', 'invoice_line_ids', 'amount_untaxed', 'journal_id']
    );

    const allLineIds = comprasOdoo.flatMap((m: any) => m.invoice_line_ids || []);
    let linesMap: any = {};
    if (allLineIds.length > 0) {
      const lines = await odoo.searchRead(
        'account.move.line',
        [['id', 'in', allLineIds]],
        ['account_id', 'price_subtotal', 'debit', 'credit'],
        0, 10000
      );
      lines.forEach((line: any) => { linesMap[line.id] = line; });
    }

    let compras_totalReposicion = 0;
    let compras_iva25 = 0;
    let gastos_odooTotal = 0;
    let gastos_iva25 = 0;

    for (const move of comprasOdoo) {
      const journalName = (move.journal_id && move.journal_id[1]) ? move.journal_id[1].toLowerCase() : "";
      const isFactura = journalName.includes("factura");
      let isGasto = false;
      let hasCompraMercancia = false;
      let baseGasto = 0;
      let retencion25 = isFactura ? (move.amount_tax || 0) * 0.25 : 0;

      const lineas = (move.invoice_line_ids || []).map((id: number) => linesMap[id]).filter(Boolean);
      
      for (const line of lineas) {
        if (!line.account_id || !line.account_id[1]) continue;
        const accountStr = line.account_id[1];
        
        if (accountStr.startsWith('5111001')) {
          hasCompraMercancia = true;
        } else if (accountStr.startsWith('6') || accountStr.startsWith('7')) {
          isGasto = true;
          baseGasto += line.price_subtotal || 0;
        }
      }

      if (isGasto && !hasCompraMercancia) {
        gastos_odooTotal += baseGasto + (move.amount_tax || 0); // Aproximado para sumar al gasto global
        gastos_iva25 += retencion25;
      } else {
        compras_totalReposicion += move.amount_total || 0;
        compras_iva25 += retencion25;
      }
    }

    // 4. GASTOS LOCALES (Prisma)
    const gastosLocal = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      },
      include: { categoria: true }
    });

    let totalNomina = 0;
    let totalServicios = 0;
    let otrosGastos = 0;

    gastosLocal.forEach(g => {
      const monto = g.totalAPagar;
      const cat = (g.categoria?.nombre || "").toLowerCase();
      if (cat.includes('nómina') || cat.includes('nomina')) {
        totalNomina += monto;
      } else if (cat.includes('servicio')) {
        totalServicios += monto;
      } else {
        otrosGastos += monto;
      }
    });

    const totalGastosAgregados = totalNomina + totalServicios + otrosGastos + gastos_odooTotal;

    const currentYear = new Date().getFullYear();
    const firstDayOfYear = `${currentYear}-01-01`;

    const posOrdersYear = await odoo.searchRead(
      'pos.order',
      [['date_order', '>=', firstDayOfYear + ' 00:00:00'], ['state', 'in', ['paid', 'done', 'invoiced']]],
      ['date_order', 'amount_total', 'amount_tax', 'margin']
    );

    const gastosLineasYear = await odoo.searchRead(
      'account.move.line',
      [
        ['date', '>=', firstDayOfYear],
        ['parent_state', '=', 'posted'],
        '|',
        ['account_id.code', '=like', '6%'],
        ['account_id.code', '=like', '7%']
      ],
      ['date', 'debit', 'credit']
    );

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const graficoMensual = meses.map(m => ({ name: m, ingresos: 0, gastos: 0 }));

    const targetMonth = new Date(fechaFin).getMonth();
    const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
    let ventasMesTarget = 0;
    let cogsMesTarget = 0;
    let gastosMesOdooTarget = 0;

    let ventasPrev = 0;
    let cogsPrev = 0;
    let gastosOdooPrev = 0;

    posOrdersYear.forEach((o: any) => {
      if (!o.date_order) return;
      const m = parseInt(o.date_order.split('-')[1], 10) - 1;
      if (m >= 0 && m < 12) {
         graficoMensual[m].ingresos += o.amount_total;
         if (m === targetMonth) {
           const amount_untaxed = (o.amount_total || 0) - (o.amount_tax || 0);
           ventasMesTarget += amount_untaxed;
           cogsMesTarget += amount_untaxed - (o.margin || 0);
         } else if (m === prevMonth) {
           const amount_untaxed = (o.amount_total || 0) - (o.amount_tax || 0);
           ventasPrev += amount_untaxed;
           cogsPrev += amount_untaxed - (o.margin || 0);
         }
      }
    });

    gastosLineasYear.forEach((l: any) => {
      if (!l.date) return;
      const m = parseInt(l.date.split('-')[1], 10) - 1;
      if (m >= 0 && m < 12) {
         const gasto = (l.debit || 0) - (l.credit || 0);
         graficoMensual[m].gastos += gasto;
         if (m === targetMonth) {
           gastosMesOdooTarget += gasto;
         } else if (m === prevMonth) {
           gastosOdooPrev += gasto;
         }
      }
    });
    
    // Obtener gastos locales de TODO el mes objetivo para el margen
    const firstDayOfTargetMonth = new Date(new Date(fechaFin).getFullYear(), targetMonth, 1);
    const lastDayOfTargetMonth = new Date(new Date(fechaFin).getFullYear(), targetMonth + 1, 0);
    const gastosLocalMes = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: firstDayOfTargetMonth,
          lte: lastDayOfTargetMonth
        }
      }
    });
    const gastosMesPrismaTarget = gastosLocalMes.reduce((sum, g) => sum + g.totalAPagar, 0);
    const totalGastosMes = gastosMesOdooTarget + gastosMesPrismaTarget;
    
    // Obtener gastos locales PREVIOS
    const firstDayOfPrevMonth = new Date(new Date(fechaFin).getFullYear() - (targetMonth === 0 ? 1 : 0), prevMonth, 1);
    const lastDayOfPrevMonth = new Date(new Date(fechaFin).getFullYear() - (targetMonth === 0 ? 1 : 0), prevMonth + 1, 0);
    const gastosLocalPrev = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: firstDayOfPrevMonth,
          lte: lastDayOfPrevMonth
        }
      }
    });
    const gastosMesPrismaPrev = gastosLocalPrev.reduce((sum, g) => sum + g.totalAPagar, 0);
    const totalGastosPrev = gastosOdooPrev + gastosMesPrismaPrev;

    const margenNetoMensual = ventasMesTarget > 0 
      ? ((ventasMesTarget - cogsMesTarget - totalGastosMes) / ventasMesTarget) * 100 
      : 0;

    const margenNetoPrevio = ventasPrev > 0 
      ? ((ventasPrev - cogsPrev - totalGastosPrev) / ventasPrev) * 100 
      : 0;
    
    return NextResponse.json({
      ingresosTotales: totalVentas,
      gastosTotales: totalGastosAgregados,
      fondoCaja: 0, // Fetch in frontend via /api/caja/global
      margenNeto: margenNetoMensual,
      margenNetoPrevio: margenNetoPrevio,
      graficoMensual,
      graficoMetodosPago: [], 
      detalles: {
        ventas: {
          total: totalVentas,
          facturado: totalFacturado,
          notasDeVenta: totalNotasDeVenta,
          impuestos: totalImpuestos,
          cxc: totalCXC
        },
        compras: {
          totalReposicion: compras_totalReposicion,
          iva25: compras_iva25
        },
        gastos: {
          nomina: totalNomina,
          servicios: totalServicios,
          otros: otrosGastos + gastos_odooTotal,
          iva25: gastos_iva25
        }
      }
    });

  } catch (error: any) {
    console.error("Error leyendo dashboard data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
