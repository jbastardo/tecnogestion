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
      return {
        id: order.id.toString(),
        fecha: order.date_order.split(' ')[0], // Solo la fecha
        baseImponibleZ: order.amount_total - order.amount_tax,
        ivaZ: order.amount_tax,
        igtfZ: order.igtf_amount || 0, // Extraído de campos locales del POS
        notasEntrega: order.mf_invoice_number ? 0 : order.amount_total, // Si tiene número de factura, es fiscal
        efectivoBs: order.amount_total, // Simulado, se debe sacar de pos.payment
        bancos: 0,
        usd: 0,
        zelle: 0,
        binance: 0,
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
