import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { OdooService } from '@/lib/odoo';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const odoo = new OdooService({
      url: process.env.ODOO_URL || 'https://onprotec.shop',
      db: process.env.ODOO_DB || 'binaural-dev-onprotec-16-release-8815487',
      username: process.env.ODOO_USERNAME || 'juan@onprotec.com',
      password: process.env.ODOO_PASSWORD || '47028d0d8c58c126b1e9276bec43158fc0c7ee41',
    });

    const compras = await odoo.searchRead(
      'account.move',
      [['move_type', 'in', ['in_invoice', 'in_receipt']], ['state', '=', 'posted']],
      ['name', 'invoice_date', 'partner_id', 'amount_untaxed', 'amount_tax', 'amount_total', 'payment_state'],
      0, 100 // Límite de 100 para no saturar
    );

    const formattedCompras = compras.map((compra: any) => {
      return {
        id: compra.id.toString(),
        fecha: compra.invoice_date || "S/F",
        proveedor: Array.isArray(compra.partner_id) ? compra.partner_id[1] : "Desconocido",
        notaEntrega: compra.name || "N/A",
        exento: 0, // Simplificación
        baseImponible: compra.amount_untaxed || 0,
        iva: compra.amount_tax || 0,
        totalPagar: compra.amount_total || 0,
        estadoPago: compra.payment_state === "paid" ? "Pagado" : "Pendiente",
        metodoPago: "N/A"
      }
    });

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
