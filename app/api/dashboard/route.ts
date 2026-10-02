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
      ['name', 'amount_total', 'amount_tax', 'session_id']
    );

    let totalVentas = 0;
    let totalImpuestos = 0;
    
    posOrders.forEach((order: any) => {
      totalVentas += order.amount_total;
      totalImpuestos += order.amount_tax;
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
    const totalCXC = cxcLines.reduce((acc: number, line: any) => {
      let saldo = line.amount_residual || 0;
      const currName = line.currency_id && line.currency_id[1] ? line.currency_id[1] : 'VES';
      if (currName === 'USD' && line.amount_residual_currency) {
         saldo = line.amount_residual_currency;
      }
      return acc + Math.abs(saldo);
    }, 0);

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
      ['date_order', 'amount_total']
    );

    const gastosYear = await odoo.searchRead(
      'account.move',
      [['move_type', 'in', ['in_invoice', 'in_receipt']], ['invoice_date', '>=', firstDayOfYear], ['state', '=', 'posted']],
      ['invoice_date', 'amount_total', 'journal_id']
    );

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const graficoMensual = meses.map(m => ({ name: m, ingresos: 0, gastos: 0 }));

    posOrdersYear.forEach((o: any) => {
      if (!o.date_order) return;
      const m = parseInt(o.date_order.split('-')[1], 10) - 1;
      if (m >= 0 && m < 12) graficoMensual[m].ingresos += o.amount_total;
    });

    gastosYear.forEach((g: any) => {
      if (!g.invoice_date) return;
      const m = parseInt(g.invoice_date.split('-')[1], 10) - 1;
      const journal = g.journal_id && g.journal_id[1] ? g.journal_id[1].toLowerCase() : '';
      if (!journal.includes('factura') && m >= 0 && m < 12) {
         graficoMensual[m].gastos += g.amount_total; // sumamos gastos (y compras que no son facturas fiscales)
      }
    });
    
    return NextResponse.json({
      ingresosTotales: totalVentas,
      gastosTotales: totalGastosAgregados,
      fondoCaja: 8543.00, // TODO: sacar de Odoo cajas
      margenNeto: totalVentas > 0 ? ((totalVentas - totalGastosAgregados) / totalVentas) * 100 : 0,
      graficoMensual,
      graficoMetodosPago: [], 
      detalles: {
        ventas: {
          total: totalVentas,
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
