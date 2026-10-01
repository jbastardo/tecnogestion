import { OdooService } from './lib/odoo';

async function run() {
  const odoo = new OdooService({
    url: process.env.ODOO_URL || 'https://onprotec.shop',
    db: process.env.ODOO_DB || 'binaural-dev-onprotec-16-release-8815487',
    username: process.env.ODOO_USERNAME || 'juan@onprotec.com',
    password: process.env.ODOO_PASSWORD || '47028d0d8c58c126b1e9276bec43158fc0c7ee41',
  });

  const fields = await odoo.executeKw('pos.order', 'fields_get', []);
  const keys = Object.keys(fields).filter(k => k.includes('journal') || k.includes('fiscal') || k.includes('invoice') || k.includes('account'));
  console.log("POS ORDER FIELDS:", keys);

  const jFields = await odoo.executeKw('account.journal', 'fields_get', []);
  const jKeys = Object.keys(jFields).filter(k => k.includes('fiscal'));
  console.log("JOURNAL FIELDS:", jKeys);
}

run().catch(console.error);
