import { NextResponse } from 'next/server';
import { OdooService } from '@/lib/odoo';

const odoo = new OdooService({
  url: process.env.ODOO_URL || 'https://www.onprotec.shop',
  db: process.env.ODOO_DB || 'binaural-dev-onprotec-16-release-8815487',
  username: process.env.ODOO_USERNAME || 'juan@onprotec.com',
  password: process.env.ODOO_PASSWORD || '47028d0d8c58c126b1e9276bec43158fc0c7ee41'
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('inicio') || '2026-01-01';
    const fechaFin = searchParams.get('fin') || '2026-12-31';

    // Accounts to track for CxC:
    // 1122001 -> Crédito Comercial
    // 1122007 -> Cashea
    // 1141001 -> ISLR Retenido
    // 1141003 -> IVA Retenido
    const cuentasClave = ['1122001', '1122007', '1141001', '1141003'];

    const lines = await odoo.searchRead(
      'account.move.line',
      [
        ['parent_state', '=', 'posted'],
        ['date', '>=', fechaInicio],
        ['date', '<=', fechaFin],
        ['account_id.code', 'in', cuentasClave],
        ['amount_residual', '!=', 0]
      ],
      ['name', 'date', 'account_id', 'amount_residual', 'amount_residual_currency', 'partner_id', 'move_id', 'currency_id']
    );

    const formattedCuentas = lines.map((line: any) => {
      const accountCode = line.account_id && line.account_id[1] ? line.account_id[1].split(' ')[0] : '';
      let concepto = 'Otros';
      if (accountCode === '1122001') concepto = 'Crédito Comercial';
      else if (accountCode === '1122007') concepto = 'Cashea';
      else if (accountCode === '1141001') concepto = 'Retención ISLR';
      else if (accountCode === '1141003') concepto = 'Retención IVA';

      // En Odoo, amount_residual suele estar en la moneda base de la empresa (VES).
      // Si hay amount_residual_currency y una currency_id diferente a VES, podemos saber el monto en divisa.
      let moneda = 'VES';
      let saldo = line.amount_residual || 0;

      const currName = line.currency_id && line.currency_id[1] ? line.currency_id[1] : 'VES';
      if (currName === 'USD' && line.amount_residual_currency) {
        moneda = 'USD';
        saldo = line.amount_residual_currency;
      }

      return {
        id: line.id.toString(),
        fecha: line.date || "S/F",
        cliente: Array.isArray(line.partner_id) ? line.partner_id[1] : "Sin cliente asignado",
        referencia: Array.isArray(line.move_id) ? line.move_id[1] : (line.name || "S/R"),
        concepto: concepto,
        moneda: moneda,
        saldo: Math.abs(saldo), // Mostramos el saldo absoluto
      };
    });

    return NextResponse.json({ cxc: formattedCuentas });
  } catch (error) {
    console.error("Error fetching CxC from Odoo:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
