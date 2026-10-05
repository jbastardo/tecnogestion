import { NextResponse } from 'next/server';
import { OdooService } from '@/lib/odoo';

const odoo = new OdooService({
  url: process.env.ODOO_URL || 'https://www.onprotec.shop',
  db: process.env.ODOO_DB || 'binaural-dev-onprotec-16-release-8815487',
  username: process.env.ODOO_USERNAME || 'juan@onprotec.com',
  password: process.env.ODOO_PASSWORD || '47028d0d8c58c126b1e9276bec43158fc0c7ee41',
});

export async function GET(req: Request) {
  try {
    const configs = await odoo.searchRead(
      'pos.config',
      [], // todos los POS
      ['name', 'active']
    );
    
    const banks = await odoo.searchRead(
      'account.journal',
      [['type', 'in', ['bank', 'cash']]],
      ['name', 'code', 'type']
    );
    
    return NextResponse.json({ configs, banks });
  } catch (error: any) {
    console.error("Error fetching odoo POS configs:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
