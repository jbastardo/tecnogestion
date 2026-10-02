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
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    
    if (type === 'proveedores') {
      const query = searchParams.get('q') || '';
      let domain: any = [];
      if (query) {
        domain = [['name', 'ilike', query]];
      } else {
        domain = [['supplier_rank', '>=', 0]]; // Load default ones
      }
      const partners = await odoo.searchRead('res.partner', domain, ['id', 'name', 'vat'], 0, 100, 'id desc');
      return NextResponse.json({ partners });
    }
    
    if (type === 'diarios') {
      const diarios = await odoo.searchRead('account.journal', [['type', 'in', ['purchase', 'general', 'bank', 'cash']]], ['id', 'name', 'type']);
      return NextResponse.json({ diarios });
    }
    
    if (type === 'cuentas_gasto') {
      const cuentas = await odoo.searchRead('account.account', ['|', ['code', '=like', '6%'], ['code', '=like', '7%']], ['id', 'name', 'code']);
      return NextResponse.json({ cuentas });
    }

    return NextResponse.json({ error: 'Tipo no soportado' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (data.type === 'proveedor') {
      const newPartnerId = await odoo.create('res.partner', {
        name: data.name,
        is_company: true,
        supplier_rank: 1,
      });
      return NextResponse.json({ id: newPartnerId, name: data.name });
    }
    return NextResponse.json({ error: 'Tipo no soportado' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
