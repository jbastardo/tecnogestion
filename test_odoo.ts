import { OdooService } from './lib/odoo';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const odoo = new OdooService({
    url: process.env.ODOO_URL || 'https://onprotec.shop',
    db: process.env.ODOO_DB || 'binaural-dev-onprotec-16-release-8815487',
    username: process.env.ODOO_USERNAME || 'juan@onprotec.com',
    password: process.env.ODOO_PASSWORD || '47028d0d8c58c126b1e9276bec43158fc0c7ee41',
  });

  const posOrders = await odoo.searchRead(
    'pos.order',
    [],
    ['name', 'date_order', 'amount_total', 'amount_tax', 'session_id', 'is_invoiced', 'igtf_amount', 'mf_invoice_number', 'mf_reportz', 'payment_ids'],
    0, 5
  );
  console.log(JSON.stringify(posOrders, null, 2));

  if (posOrders.length > 0 && posOrders[0].payment_ids.length > 0) {
    const payments = await odoo.searchRead('pos.payment', [['id', 'in', posOrders[0].payment_ids]], []);
    console.log("Payments for first order:", JSON.stringify(payments, null, 2));
  }
}

run().catch(console.error);
