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

    const cxcLines = await odoo.searchRead(
      'account.move.line',
      [['account_id.account_type', '=', 'asset_receivable'], ['parent_state', '=', 'posted'], ['amount_residual', '!=', 0]],
      ['amount_residual']
    );
    const totalCXC = cxcLines.reduce((acc: number, line: any) => acc + line.amount_residual, 0);

    // 2 & 3. COMPRAS Y GASTOS ODOO (account.move)
    const comprasOdoo = await odoo.searchRead(
      'account.move',
      [['move_type', 'in', ['in_invoice', 'in_receipt']], ['invoice_date', '>=', fechaInicio], ['invoice_date', '<=', fechaFin], ['state', '=', 'posted']],
      ['amount_total', 'amount_tax', 'invoice_line_ids', 'amount_untaxed']
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
      let isGasto = false;
      let hasCompraMercancia = false;
      let baseGasto = 0;
      let retencion25 = 0;

      const lineas = (move.invoice_line_ids || []).map((id: number) => linesMap[id]).filter(Boolean);
      
      for (const line of lineas) {
        if (!line.account_id || !line.account_id[1]) continue;
        const accountStr = line.account_id[1];
        
        if (accountStr.startsWith('5111001')) {
          hasCompraMercancia = true;
        } else if (accountStr.startsWith('2131004')) {
          retencion25 += line.credit || line.debit || 0;
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

    const graficoMensual = [
      { name: "Periodo", ingresos: totalVentas, gastos: totalGastosAgregados },
    ];
    
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
