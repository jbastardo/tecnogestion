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

const isMetodoExcluido = (name: string) => {
  const lower = (name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const keywords = ['retencion', 'islr', 'imp. municipal', 'impuesto', 'credito', 'por cobrar', 'cxc', 'delivery', 'saldo a favor', 'diferencia'];
  return keywords.some(k => lower.includes(k));
};

const getOdooCajaResumen = async (config_id: number, cajaName: string, inicio?: string | null, fin?: string | null) => {
    try {
        const domainSession: any[] = [['config_id', '=', config_id]];
        if (inicio && fin) {
          domainSession.push(['start_at', '>=', inicio + ' 00:00:00']);
          domainSession.push(['start_at', '<=', fin + ' 23:59:59']);
        }

        const sessions = await odoo.searchRead(
            'pos.session',
            domainSession,
            ['name', 'state', 'start_at', 'stop_at', 'cash_register_balance_start', 'cash_register_balance_end_real', 'cash_register_difference'],
            0, inicio && fin ? 20 : 1,
            'id desc'
        );
        if (!sessions || sessions.length === 0) return null;
        const cajaAbierta = sessions[0];

        const sessionIds = sessions.map((s: any) => s.id);
        const payments = await odoo.searchRead('pos.payment', [['session_id', 'in', sessionIds]], ['amount', 'payment_method_id']);
        
        let ingresosUsd = 0;
        let ingresosBs = 0;
        let egresosUsd = 0;
        let egresosBs = 0;
        
        payments.forEach((p: any) => {
           const methodName = p.payment_method_id && p.payment_method_id[1] ? p.payment_method_id[1] : '';
           if (isMetodoExcluido(methodName)) {
             return; // Excluir créditos, delivery, saldo a favor, retenciones
           }
           const method = methodName.toLowerCase();
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
        const saldoAperturaBs = cajaAbierta.cash_register_balance_start || 0;
        const saldoActualBs = saldoAperturaBs + ingresosBs - egresosBs;

        return {
            id: `odoo_${config_id}`,
            name: `${cajaName}`,
            category: 'POS',
            type: 'POS_ODOO',
            saldoAperturaUsd: 0,
            saldoAperturaBs: saldoAperturaBs,
            saldoActualUsd,
            saldoActualBs
        };
    } catch(e) {
        return null;
    }
};

const getLocalCajaResumen = async (cajaId: string, cajaName: string, inicio?: string | null, fin?: string | null) => {
    const cajaAbierta = await prisma.aperturaCierreCaja.findFirst({
      where: { cajaId, estado: 'ABIERTA' },
      orderBy: { fechaApertura: 'desc' }
    });

    if (!cajaAbierta) return null;

    const whereMov: any = { cajaId };
    if (inicio && fin) {
      whereMov.fecha = {
        gte: new Date(inicio + 'T00:00:00.000Z'),
        lte: new Date(fin + 'T23:59:59.999Z')
      };
    } else {
      whereMov.fecha = { gte: cajaAbierta.fechaApertura };
    }

    const movimientos = await prisma.movimientoCaja.findMany({
      where: whereMov
    });

    const ingresosUsd = movimientos.filter(m => m.tipo === 'INGRESO').reduce((acc, m) => acc + m.montoUsd, 0);
    const egresosUsd = movimientos.filter(m => m.tipo === 'EGRESO').reduce((acc, m) => acc + m.montoUsd, 0);
    
    const ingresosBs = movimientos.filter(m => m.tipo === 'INGRESO').reduce((acc, m) => acc + m.montoBs, 0);
    const egresosBs = movimientos.filter(m => m.tipo === 'EGRESO').reduce((acc, m) => acc + m.montoBs, 0);

    return {
        id: cajaId,
        name: cajaName,
        category: 'LOCAL',
        type: 'LOCAL',
        saldoAperturaUsd: cajaAbierta.saldoAperturaUsd,
        saldoAperturaBs: cajaAbierta.saldoAperturaBs,
        saldoActualUsd: cajaAbierta.saldoAperturaUsd + ingresosUsd - egresosUsd,
        saldoActualBs: cajaAbierta.saldoAperturaBs + ingresosBs - egresosBs
    };
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');

    const cajasLocales = [
        { id: 'boveda', name: 'Bóveda Principal' },
        { id: 'caja_chica', name: 'Caja Chica' }
    ];

    const localPromises = cajasLocales.map(c => getLocalCajaResumen(c.id, c.name, inicio, fin));
    
    // Obtener POS configs
    let odooConfigs = [];
    try {
        odooConfigs = await odoo.searchRead('pos.config', [], ['name', 'active']);
    } catch(e) {}
    
    const odooPosPromises = odooConfigs.map((c: any) => getOdooCajaResumen(c.id, c.name, inicio, fin));

    // Obtener Diarios de Bancos (filtrando metodos no deseados)
    let bankResumens: any[] = [];
    try {
        const rawJournals = await odoo.searchRead(
            'account.journal',
            [['type', 'in', ['bank', 'cash']]],
            ['name', 'code', 'type', 'default_account_id', 'currency_id']
        );
        
        // Excluir retenciones, delivery, creditos, diferencias, cxc
        const journals = rawJournals.filter((j: any) => !isMetodoExcluido(j.name));
        const accountIds = journals.map((j: any) => j.default_account_id && j.default_account_id[0]).filter(Boolean);
        
        if (accountIds.length > 0) {
            const domainMoveLines: any[] = [
                ['account_id', 'in', accountIds],
                ['parent_state', '=', 'posted']
            ];
            if (inicio && fin) {
              domainMoveLines.push(['date', '>=', inicio]);
              domainMoveLines.push(['date', '<=', fin]);
            }

            const balances = await odoo.executeKw('account.move.line', 'read_group', [
                domainMoveLines,
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
                    category: 'BANCO',
                    type: 'BANCO_ODOO',
                    saldoAperturaUsd: 0,
                    saldoAperturaBs: 0,
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
    let totalAperturaUsd = 0;
    let totalAperturaBs = 0;

    activeCajas.forEach(c => {
        totalUsd += c?.saldoActualUsd || 0;
        totalBs += c?.saldoActualBs || 0;
        totalAperturaUsd += c?.saldoAperturaUsd || 0;
        totalAperturaBs += c?.saldoAperturaBs || 0;
    });

    return NextResponse.json({
        totalUsd,
        totalBs,
        totalAperturaUsd,
        totalAperturaBs,
        cajas: activeCajas
    });
  } catch (error: any) {
    console.error("Error fetching global cajas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
