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

const getOdooCajaResumen = async (config_id: number, cajaName: string) => {
    try {
        const sessions = await odoo.searchRead(
            'pos.session',
            [['config_id', '=', config_id]],
            ['name', 'state', 'start_at', 'stop_at', 'cash_register_balance_start', 'cash_register_balance_end_real', 'cash_register_difference'],
            0, 1,
            'id desc'
        );
        const cajaAbierta = sessions[0];
        if (!cajaAbierta) return null;

        const isAbierta = cajaAbierta.state === 'opened' || cajaAbierta.state === 'closing_control';
        if (!isAbierta) return null;

        const payments = await odoo.searchRead('pos.payment', [['session_id', '=', cajaAbierta.id]], ['amount', 'payment_method_id']);
        
        let ingresosUsd = 0;
        let ingresosBs = 0;
        let egresosUsd = 0;
        let egresosBs = 0;
        
        payments.forEach((p: any) => {
           const method = p.payment_method_id && p.payment_method_id[1] ? p.payment_method_id[1].toLowerCase() : '';
           const isUsd = method.includes('dolar') || method.includes('usd') || method.includes('divisa') || method.includes('zelle') || method.includes('binance') || method.includes('usdt');
           if (isUsd) {
              if (p.amount > 0) ingresosUsd += p.amount;
              else egresosUsd += Math.abs(p.amount);
           } else {
              if (p.amount > 0) ingresosBs += p.amount;
              else egresosBs += Math.abs(p.amount);
           }
        });

        const saldoActualUsd = ingresosUsd - egresosUsd;
        const saldoActualBs = (cajaAbierta.cash_register_balance_start || 0) + ingresosBs - egresosBs;

        return {
            id: `odoo_${config_id}`,
            name: `POS: ${cajaName}`,
            type: 'POS_ODOO',
            saldoActualUsd,
            saldoActualBs
        };
    } catch(e) {
        return null;
    }
};

const getLocalCajaResumen = async (cajaId: string, cajaName: string) => {
    const cajaAbierta = await prisma.aperturaCierreCaja.findFirst({
      where: { cajaId, estado: 'ABIERTA' },
      orderBy: { fechaApertura: 'desc' }
    });

    if (!cajaAbierta) return null;

    const movimientos = await prisma.movimientoCaja.findMany({
      where: { cajaId, fecha: { gte: cajaAbierta.fechaApertura } }
    });

    const ingresosUsd = movimientos.filter(m => m.tipo === 'INGRESO').reduce((acc, m) => acc + m.montoUsd, 0);
    const egresosUsd = movimientos.filter(m => m.tipo === 'EGRESO').reduce((acc, m) => acc + m.montoUsd, 0);
    
    const ingresosBs = movimientos.filter(m => m.tipo === 'INGRESO').reduce((acc, m) => acc + m.montoBs, 0);
    const egresosBs = movimientos.filter(m => m.tipo === 'EGRESO').reduce((acc, m) => acc + m.montoBs, 0);

    return {
        id: cajaId,
        name: cajaName,
        type: 'LOCAL',
        saldoActualUsd: cajaAbierta.saldoAperturaUsd + ingresosUsd - egresosUsd,
        saldoActualBs: cajaAbierta.saldoAperturaBs + ingresosBs - egresosBs
    };
};

export async function GET(req: Request) {
  try {
    const cajasLocales = [
        { id: 'boveda', name: 'Bóveda Principal' },
        { id: 'caja_chica', name: 'Caja Chica' }
    ];

    const localPromises = cajasLocales.map(c => getLocalCajaResumen(c.id, c.name));
    
    // Obtener POS configs
    let odooConfigs = [];
    try {
        odooConfigs = await odoo.searchRead('pos.config', [], ['name', 'active']);
    } catch(e) {}
    
    const odooPosPromises = odooConfigs.map((c: any) => getOdooCajaResumen(c.id, c.name));

    // Obtener Diarios de Bancos y Efectivo
    let bankResumens: any[] = [];
    try {
        const journals = await odoo.searchRead(
            'account.journal',
            [['type', 'in', ['bank', 'cash']]],
            ['name', 'code', 'type', 'default_account_id', 'currency_id']
        );
        const accountIds = journals.map((j: any) => j.default_account_id && j.default_account_id[0]).filter(Boolean);
        
        if (accountIds.length > 0) {
            const balances = await odoo.executeKw('account.move.line', 'read_group', [
                [['account_id', 'in', accountIds], ['parent_state', '=', 'posted']],
                ['debit', 'credit'],
                ['account_id']
            ]);
            
            const balanceMap: any = {};
            balances.forEach((b: any) => {
                if (b.account_id) {
                    balanceMap[b.account_id[0]] = (b.debit || 0) - (b.credit || 0);
                }
            });
            
            bankResumens = journals.map((j: any) => {
                const accId = j.default_account_id ? j.default_account_id[0] : null;
                const balance = accId ? (balanceMap[accId] || 0) : 0;
                const currency = j.currency_id && j.currency_id[1] ? j.currency_id[1] : 'Bs';
                const isUsd = currency.includes('USD') || currency.includes('$');
                return {
                    id: `journal_${j.id}`,
                    name: j.name,
                    type: 'BANCO_ODOO',
                    saldoActualUsd: isUsd ? balance : 0,
                    saldoActualBs: !isUsd ? balance : 0
                };
            });
        }
    } catch(e) {
        console.error("Error fetching Odoo Banks:", e);
    }

    const results = await Promise.all([...localPromises, ...odooPosPromises]);
    const activeCajas = [...results.filter(r => r !== null), ...bankResumens];

    let totalUsd = 0;
    let totalBs = 0;

    activeCajas.forEach(c => {
        totalUsd += c?.saldoActualUsd || 0;
        totalBs += c?.saldoActualBs || 0;
    });

    return NextResponse.json({
        totalUsd,
        totalBs,
        cajas: activeCajas
    });
  } catch (error: any) {
    console.error("Error fetching global cajas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
