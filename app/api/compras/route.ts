import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { OdooService } from '@/lib/odoo';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const odoo = new OdooService({
      url: process.env.ODOO_URL || 'https://www.onprotec.shop',
      db: process.env.ODOO_DB || 'binaural-dev-onprotec-16-release-8815487',
      username: process.env.ODOO_USERNAME || 'juan@onprotec.com',
      password: process.env.ODOO_PASSWORD || '47028d0d8c58c126b1e9276bec43158fc0c7ee41',
    });

    const { searchParams } = new URL(req.url);
    const fechaInicio = searchParams.get('inicio') || new Date().toISOString().split('T')[0];
    const fechaFin = searchParams.get('fin') || new Date().toISOString().split('T')[0];

    const moves = await odoo.searchRead(
      'account.move',
      [
        ['move_type', 'in', ['in_invoice', 'in_receipt']], 
        ['state', '=', 'posted'],
        ['invoice_date', '>=', fechaInicio],
        ['invoice_date', '<=', fechaFin]
      ],
      ['name', 'invoice_date', 'partner_id', 'amount_untaxed', 'amount_tax', 'amount_total', 'payment_state', 'move_type', 'amount_residual', 'invoice_line_ids', 'currency_id', 'journal_id'],
      0, 200 // Límite de 200
    );

    // Obtener todas las líneas de factura
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

    const formattedCompras: any[] = [];

    for (const compra of moves) {
      // Determinar si es factura o nota basado en el diario
      const journalName = (compra.journal_id && compra.journal_id[1]) ? compra.journal_id[1].toLowerCase() : "";
      const isFactura = journalName.includes("factura");
      const tipoOperacion = isFactura ? "Factura" : "Nota de Entrega";
      const moneda = (compra.currency_id && compra.currency_id[1]) ? compra.currency_id[1] : "USD";
      
      let isGasto = false;
      let hasCompraMercancia = false;
      
      let baseImponible = 0;
      let retencion25 = 0;

      const lineas = (compra.invoice_line_ids || []).map((id: number) => linesMap[id]).filter(Boolean);
      
      for (const line of lineas) {
        if (!line.account_id || !line.account_id[1]) continue;
        const accountStr = line.account_id[1];
        
        if (accountStr.startsWith('5111001')) {
          hasCompraMercancia = true;
          baseImponible += line.price_subtotal || 0;
        }
        else if (accountStr.startsWith('6') || accountStr.startsWith('7')) {
          isGasto = true;
        }
      }

      // Nueva regla: retencion 25% del IVA solo para facturas fiscales
      if (isFactura) {
        retencion25 = (compra.amount_tax || 0) * 0.25;
      }

      // Filtrar: Si es netamente un gasto (tiene cuenta 6 o 7 pero NO tiene 5111001), lo ignoramos de Compras
      if (isGasto && !hasCompraMercancia) {
        continue;
      }

      // Si no tiene 5111001 pero tampoco es un gasto (quizás una devolución, notas, u otra cuenta), lo dejamos pasar con el monto base general
      if (!hasCompraMercancia) {
        baseImponible = compra.amount_untaxed || 0;
      }

      const cxc = compra.amount_residual || 0;
      const pagadoTotal = compra.amount_total - cxc;

      formattedCompras.push({
        id: compra.id.toString(),
        fecha: compra.invoice_date || "S/F",
        proveedor: Array.isArray(compra.partner_id) ? compra.partner_id[1] : "Desconocido",
        tipoOperacion: tipoOperacion,
        moneda: moneda,
        referencia: compra.name || "N/A",
        exento: 0,
        baseImponible: baseImponible,
        impuestos: compra.amount_tax || 0,
        retencion25: retencion25,
        totalOperacion: compra.amount_total || 0,
        pagadoTotal: pagadoTotal,
        cxp: cxc,
        estadoPago: compra.payment_state === "paid" ? "Pagado" : "Pendiente",
      });
    }

    return NextResponse.json({ compras: formattedCompras });
  } catch (error: any) {
    console.error("Error reading compras from Odoo:", error);
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
    const categoria = await prisma.categoriaCompra.upsert({
      where: { nombre: (body.tipoCompra || "General").trim() },
      update: {},
      create: { nombre: (body.tipoCompra || "General").trim() }
    });

    // Upsert MetodoPago
    const metodoPago = await prisma.metodoPago.upsert({
      where: { nombre: (body.metodoPago || "N/A").trim() },
      update: {},
      create: { nombre: (body.metodoPago || "N/A").trim() }
    });

    const nuevaCompra = await prisma.compra.create({
      data: {
        fechaFactura: new Date(body.fecha),
        proveedorId: proveedor.id,
        categoriaId: categoria.id,
        metodoPagoId: metodoPago.id,
        notaEntrega: body.notaEntrega || "",
        exento: parseFloat(body.exento || 0),
        baseImponible: parseFloat(body.baseImponible || 0),
        iva: parseFloat(body.iva || 0),
        totalAPagar: parseFloat(body.totalPagar || 0),
        estadoPago: body.estadoPago || "POR PAGAR"
      }
    });

    return NextResponse.json({ success: true, compra: nuevaCompra });
  } catch (error: any) {
    console.error("Error creating compra:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.compra.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting compra:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
