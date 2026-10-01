import { NextResponse } from 'next/server';
import { OdooService } from '@/lib/odoo';

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

    // Buscar en el POS
    const domain = [
      ['date_order', '>=', fechaInicio + ' 00:00:00'],
      ['date_order', '<=', fechaFin + ' 23:59:59'],
      ['state', 'in', ['paid', 'done', 'invoiced']]
    ];

    const posOrders = await odoo.searchRead(
      'pos.order',
      domain,
      ['name', 'date_order', 'amount_total', 'amount_tax', 'session_id', 'is_invoiced', 'igtf_amount', 'mf_invoice_number', 'mf_reportz']
    );

    // Mapeo simple a la estructura que espera la UI (simulando los datos de la vieja BD)
    const formattedIngresos = posOrders.map((order: any) => {
      const esFiscal = order.is_invoiced || order.mf_invoice_number;
      
      const pagadoTotal = order.amount_paid || order.amount_total; // En POS de Odoo generalmente se paga completo, simulamos si falta.
      const cxc = order.amount_total - pagadoTotal;

      return {
        id: order.id.toString(),
        fecha: order.date_order.split(' ')[0], // Solo la fecha
        tipoOperacion: esFiscal ? 'Factura' : 'Nota de Entrega',
        referencia: order.mf_invoice_number || order.name || "N/A",
        totalOperacion: order.amount_total || 0,
        baseImponible: esFiscal ? order.amount_total - order.amount_tax : order.amount_total,
        impuestos: esFiscal ? order.amount_tax + (order.igtf_amount || 0) : 0,
        pagadoTotal: pagadoTotal,
        cxc: cxc > 0 ? cxc : 0,
      };
    });

    return NextResponse.json({ ingresos: formattedIngresos });
  } catch (error: any) {
    console.error("Error reading ingresos from Odoo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method Not Allowed. Ingresos are read-only from Odoo." }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed. Ingresos are read-only from Odoo." }, { status: 405 });
}
