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
      if (!query || query.length < 3) {
        return NextResponse.json({ partners: [] }); // Solo buscar si hay al menos 3 caracteres
      }
      
      const domain = ['|', ['name', 'ilike', query], ['vat', 'ilike', query]];
      const partners = await odoo.searchRead('res.partner', domain, ['id', 'name', 'vat'], 0, 50, 'id desc');
      return NextResponse.json({ partners });
    }
    
    if (type === 'diarios') {
      const allJournals = await odoo.searchRead('account.journal', [], ['id', 'name', 'type']);
      
      const diariosNombres = ["Relación de Gastos", "Relacion de Gastos", "Recibos de Proveedores", "Factura de compras", "Facturas de compras"];
      const metodosNombres = [
        "Cuenta por cobrar a Cashea al BNC", "Binance", "Efectivo Dolares", "PDV Banesco Bs", 
        "Banesco Cte Bs", "Venezuela Bs", "Retenciones IVA Proveedores", "Retenciones ISLR Proveedores", 
        "Imp. Municipal Libertador Proveedores", "Banesco Panama $", "Banesco Panama CM $"
      ];

      const diarios = allJournals.filter((j: any) => diariosNombres.some(n => j.name.toLowerCase().includes(n.toLowerCase())));
      const metodos_pago = allJournals.filter((j: any) => metodosNombres.some(n => j.name.toLowerCase().includes(n.toLowerCase())));
      
      return NextResponse.json({ diarios, metodos_pago });
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
