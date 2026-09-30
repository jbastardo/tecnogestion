import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { OdooService } from '@/lib/odoo';

const prisma = new PrismaClient();

const odoo = new OdooService({
  url: process.env.ODOO_URL || 'https://onprotec.shop',
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
    // Extraemos del POS (órdenes cerradas/pagadas)
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

    // CXC (Cuentas por cobrar - general, usando apuntes contables a cobrar)
    const cxcLines = await odoo.searchRead(
      'account.move.line',
      [['account_id.account_type', '=', 'asset_receivable'], ['parent_state', '=', 'posted'], ['amount_residual', '!=', 0]],
      ['amount_residual']
    );
    const totalCXC = cxcLines.reduce((acc: number, line: any) => acc + line.amount_residual, 0);

    // 2. COMPRAS (Odoo - account.move)
    const compras = await odoo.searchRead(
      'account.move',
      [['move_type', 'in', ['in_invoice', 'in_receipt']], ['date', '>=', fechaInicio], ['date', '<=', fechaFin], ['state', '=', 'posted']],
      ['amount_total', 'amount_tax']
    );
    let totalCompras = 0;
    let totalIvaCompras = 0;
    compras.forEach((c: any) => {
      totalCompras += c.amount_total;
      totalIvaCompras += c.amount_tax;
    });
    const iva25Compras = totalIvaCompras * 0.25;

    // 3. GASTOS (Local Prisma)
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
      const monto = moneda === 'USD' ? g.totalUsd : g.totalAPagar;
      const cat = g.categoria.nombre.toLowerCase();
      if (cat.includes('nómina') || cat.includes('nomina')) {
        totalNomina += monto;
      } else if (cat.includes('servicio')) {
        totalServicios += monto;
      } else {
        otrosGastos += monto;
      }
    });

    // 4. MOCKS DE GRÁFICOS (Para compatibilidad con UI actual)
    const graficoMensual = [
      { name: "Periodo", ingresos: totalVentas, gastos: totalNomina + totalServicios + otrosGastos },
    ];
    
    return NextResponse.json({
      ingresosTotales: totalVentas,
      gastosTotales: totalNomina + totalServicios + otrosGastos,
      fondoCaja: 8543.00, // TODO: sacar de Odoo cajas
      margenNeto: totalVentas > 0 ? ((totalVentas - (totalNomina + totalServicios + otrosGastos)) / totalVentas) * 100 : 0,
      graficoMensual,
      graficoMetodosPago: [], // TODO: Desglosar pagos del POS
      // Detallado para dashboard nuevo:
      detalles: {
        ventas: {
          total: totalVentas,
          impuestos: totalImpuestos,
          cxc: totalCXC
        },
        compras: {
          totalReposicion: totalCompras,
          iva25: iva25Compras
        },
        gastos: {
          nomina: totalNomina,
          servicios: totalServicios,
          otros: otrosGastos,
        }
      }
    });

  } catch (error: any) {
    console.error("Error leyendo dashboard data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
