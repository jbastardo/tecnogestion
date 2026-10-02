import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { OdooService } from '@/lib/odoo';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fechaInicio = searchParams.get('inicio') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
    const fechaFin = searchParams.get('fin') || new Date().toISOString().split('T')[0];

    // 1. Fetch from Prisma (Local Gastos)
    const gastosData = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      },
      include: {
        proveedor: true,
        categoria: true,
        metodoPago: true,
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    const formattedGastos = gastosData.map((gasto: any) => ({
      id: "local_" + gasto.id,
      fecha: gasto.fecha.toISOString().split('T')[0],
      concepto: gasto.concepto,
      tipoGasto: gasto.categoria?.nombre || "General",
      tipoOperacion: "Recibo Interno",
      moneda: "USD",
      notaEntrega: gasto.notaEntrega || "",
      exento: gasto.exento,
      baseImponible: gasto.baseImponible,
      iva: gasto.iva,
      retencion25: 0, // Prisma no tiene este campo por defecto aun
      totalPagar: gasto.totalAPagar,
      pagadoTotal: gasto.estadoPago === "PAGADO" ? gasto.totalAPagar : 0,
      cxp: gasto.estadoPago !== "PAGADO" ? gasto.totalAPagar : 0,
      metodoPago: gasto.metodoPago?.nombre || "N/A",
      status: gasto.estadoPago,
      proveedor: gasto.proveedor?.nombre || "N/A",
      origen: "Local"
    }));

    // 2. Fetch from Odoo (Gastos categories 6 and 7)
    const odoo = new OdooService({
      url: process.env.ODOO_URL || 'https://www.onprotec.shop',
      db: process.env.ODOO_DB || 'binaural-dev-onprotec-16-release-8815487',
      username: process.env.ODOO_USERNAME || 'juan@onprotec.com',
      password: process.env.ODOO_PASSWORD || '47028d0d8c58c126b1e9276bec43158fc0c7ee41',
    });

    const moves = await odoo.searchRead(
      'account.move',
      [
        ['move_type', 'in', ['in_invoice', 'in_receipt']], 
        ['state', '=', 'posted'],
        ['invoice_date', '>=', fechaInicio],
        ['invoice_date', '<=', fechaFin]
      ],
      ['name', 'invoice_date', 'partner_id', 'amount_untaxed', 'amount_tax', 'amount_total', 'payment_state', 'move_type', 'amount_residual', 'invoice_line_ids', 'currency_id', 'journal_id'],
      0, 200
    );

    const allLineIds = moves.flatMap((m: any) => m.invoice_line_ids || []);
    let linesMap: any = {};
    
    if (allLineIds.length > 0) {
      const lines = await odoo.searchRead(
        'account.move.line',
        [['id', 'in', allLineIds]],
        ['account_id', 'price_subtotal', 'debit', 'credit', 'price_total'],
        0, 10000
      );
      lines.forEach((line: any) => {
        linesMap[line.id] = line;
      });
    }

    const odooGastos: any[] = [];

    for (const compra of moves) {
      const journalName = (compra.journal_id && compra.journal_id[1]) ? compra.journal_id[1].toLowerCase() : "";
      const isFactura = journalName.includes("factura");
      const tipoOperacion = isFactura ? "Factura" : "Nota de Entrega";
      const moneda = (compra.currency_id && compra.currency_id[1]) ? compra.currency_id[1] : "USD";

      let isGasto = false;
      let hasCompraMercancia = false;
      let baseImponibleGasto = 0;
      let retencion25 = 0;

      const lineas = (compra.invoice_line_ids || []).map((id: number) => linesMap[id]).filter(Boolean);
      
      for (const line of lineas) {
        if (!line.account_id || !line.account_id[1]) continue;
        const accountStr = line.account_id[1];
        
        if (accountStr.startsWith('5111001')) {
          hasCompraMercancia = true;
        }
        else if (accountStr.startsWith('6') || accountStr.startsWith('7')) {
          isGasto = true;
          baseImponibleGasto += line.price_subtotal || 0;
        }
      }

      // Nueva regla: retencion 25% del IVA solo para facturas fiscales
      if (isFactura) {
        retencion25 = (compra.amount_tax || 0) * 0.25;
      }

      // Filtrar: Solo nos interesan las facturas que tengan gastos y que NO sean una compra de mercancía pura.
      // (Si tiene mercancía, ya se mostró en compras. Si queremos mostrar la parte de gasto aquí, lo hacemos).
      if (!isGasto) {
        continue;
      }

      const cxc = compra.amount_residual || 0;
      const pagadoTotal = compra.amount_total - cxc;

      odooGastos.push({
        id: "odoo_" + compra.id.toString(),
        fecha: compra.invoice_date || "S/F",
        concepto: compra.name || "Gasto Odoo",
        tipoGasto: "Operativo",
        tipoOperacion: tipoOperacion,
        moneda: moneda,
        notaEntrega: "",
        exento: 0,
        baseImponible: baseImponibleGasto, // Solo la suma de líneas 6 y 7
        iva: compra.amount_tax || 0,
        retencion25: retencion25, // Retención si la hay
        totalPagar: (baseImponibleGasto + (compra.amount_tax || 0)) - retencion25, // Aproximación
        pagadoTotal: pagadoTotal,
        cxp: cxc,
        metodoPago: "N/A",
        status: compra.payment_state === "paid" ? "PAGADO" : "POR PAGAR",
        proveedor: Array.isArray(compra.partner_id) ? compra.partner_id[1] : "Desconocido",
        origen: "Odoo"
      });
    }

    const allGastos = [...formattedGastos, ...odooGastos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return NextResponse.json({ gastos: allGastos });
  } catch (error: any) {
    console.error("Error fetching gastos from DB:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Upsert Proveedor
    const proveedor = await prisma.proveedor.upsert({
      where: { nombre: body.proveedor.trim() },
      update: {},
      create: { nombre: body.proveedor.trim() }
    });

    // Upsert Categoria
    const categoria = await prisma.categoriaGasto.upsert({
      where: { nombre: body.tipoGasto.trim() },
      update: {},
      create: { nombre: body.tipoGasto.trim() }
    });

    // Upsert MetodoPago
    const metodoPago = await prisma.metodoPago.upsert({
      where: { nombre: (body.metodoPago || "N/A").trim() },
      update: {},
      create: { nombre: (body.metodoPago || "N/A").trim() }
    });

    const nuevoGasto = await prisma.gasto.create({
      data: {
        fecha: new Date(body.fecha),
        concepto: body.concepto,
        proveedorId: proveedor.id,
        categoriaId: categoria.id,
        metodoPagoId: metodoPago.id,
        notaEntrega: body.notaEntrega || "",
        exento: parseFloat(body.exento || 0),
        baseImponible: parseFloat(body.baseImponible || 0),
        iva: parseFloat(body.iva || 0),
        totalAPagar: parseFloat(body.totalPagar || 0),
        estadoPago: body.status || "POR PAGAR"
      }
    });

    return NextResponse.json({ success: true, gasto: nuevoGasto });
  } catch (error: any) {
    console.error("Error creating gasto:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.gasto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting gasto:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
