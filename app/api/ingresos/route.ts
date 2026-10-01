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
      ['name', 'date_order', 'amount_total', 'amount_tax', 'session_id', 'is_invoiced', 'igtf_amount', 'mf_invoice_number', 'mf_reportz', 'payment_ids', 'amount_paid']
    );

    // Recolectar todos los IDs de pago
    const allPaymentIds = posOrders.reduce((acc: number[], order: any) => {
      if (order.payment_ids && Array.isArray(order.payment_ids)) {
        return acc.concat(order.payment_ids);
      }
      return acc;
    }, []);

    let allPayments: any[] = [];
    if (allPaymentIds.length > 0) {
      allPayments = await odoo.searchRead(
        'pos.payment',
        [['id', 'in', allPaymentIds]],
        ['payment_method_id', 'amount', 'pos_order_id']
      );
    }

    const formattedIngresos = posOrders.map((order: any) => {
      // CAJA-* orders are POS receipts (Nota de Entrega). Fiscal invoices have mf_invoice_number.
      const esFiscal = !!order.mf_invoice_number || (order.is_invoiced && !String(order.name).startsWith('CAJA-'));
      
      const pagadoTotal = order.amount_paid || order.amount_total;
      const cxc = order.amount_total - pagadoTotal;

      // Filtrar pagos para esta orden
      const orderPayments = allPayments.filter(p => p.pos_order_id && p.pos_order_id[0] === order.id);
      
      let pagadoUSD = 0;
      let pagadoBs = 0; 
      let pagadoCredito = 0; // Se considerará CxC
      let pagadoRetencion = 0;
      
      const desglosePagos = orderPayments.map(p => {
        const methodName = (p.payment_method_id && p.payment_method_id[1]) ? p.payment_method_id[1].toLowerCase() : '';
        
        // 1. Es Crédito (CxC)
        const isCredito = methodName.includes('crédito') || methodName.includes('credito') || methodName.includes('cashea') || methodName.includes('pxc') || methodName.includes('cxc');
        // 2. Es Retención
        const isRetencion = methodName.includes('retencion') || methodName.includes('retención');
        
        // 3. Determinar Moneda Base
        let isBs = methodName.includes('bs') || methodName.includes('bolivar') || methodName.includes('pago movil') || methodName.includes('punto') || methodName.includes('transferencia') || methodName.includes('pabilo venezuela') || methodName.includes('megasoft') || methodName.includes('bancamiga');
        let isUSD = methodName.includes('$') || methodName.includes('zelle') || methodName.includes('binance') || methodName.includes('panama') || methodName.includes('verde') || methodName.includes('pabilo binance') || methodName.includes('saldo a favor');

        // Reglas especiales
        if (isCredito) {
          isUSD = true; // Por regla de negocio, los créditos se consideran en $
          isBs = false;
        }

        // Si no se detectó moneda explícita y no es crédito/retención, asume Bs por defecto
        if (!isBs && !isUSD && !isRetencion) {
          isBs = true; 
        }

        // Sumarizadores
        if (isRetencion) {
          pagadoRetencion += p.amount;
        } else if (isCredito) {
          pagadoCredito += p.amount;
        } else if (isUSD) {
          pagadoUSD += p.amount;
        } else if (isBs) {
          pagadoBs += p.amount; 
        }

        return {
          metodo: p.payment_method_id ? p.payment_method_id[1] : 'Desconocido',
          monto: p.amount,
          esBs: isBs,
          esCredito: isCredito,
          esRetencion: isRetencion,
          esUSD: isUSD
        };
      });

      const pagadoTotalEfectivo = pagadoTotal - pagadoCredito - pagadoRetencion;
      const cxcReal = cxc + pagadoCredito;

      return {
        id: order.id.toString(),
        fecha: order.date_order.split(' ')[0], 
        tipoOperacion: esFiscal ? 'Factura' : 'Nota de Entrega',
        referencia: order.mf_invoice_number || order.name || "N/A",
        totalOperacion: order.amount_total || 0,
        baseImponible: esFiscal ? order.amount_total - order.amount_tax : order.amount_total,
        impuestos: esFiscal ? order.amount_tax : 0,
        igtf: esFiscal ? (order.igtf_amount || 0) : 0,
        pagadoTotal: pagadoTotalEfectivo,
        cxc: cxcReal > 0 ? cxcReal : 0,
        pagos: desglosePagos,
        pagadoUSD,
        pagadoBs,
        pagadoRetencion
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
