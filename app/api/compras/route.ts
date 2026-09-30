import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const compras = await prisma.compra.findMany({
      include: {
        proveedor: true,
        categoria: true,
        metodoPago: true
      },
      orderBy: { fechaFactura: 'desc' }
    });

    const formattedCompras = compras.map((compra) => {
      return {
        id: compra.id,
        fecha: compra.fechaFactura ? compra.fechaFactura.toISOString().split('T')[0] : "S/F",
        proveedor: compra.proveedor?.nombre || "Sin proveedor",
        notaEntrega: compra.notaEntrega || "",
        numeroFactura: "", // Schema missing numeroFactura, defaulting to empty for UI compatibility
        exento: compra.exento || 0,
        baseImponible: compra.baseImponible || 0,
        iva: compra.iva || 0,
        totalPagar: compra.totalAPagar || 0,
        metodoPago: compra.metodoPago?.nombre || "N/A",
        estadoPago: compra.estadoPago || "N/A",
      }
    });

    return NextResponse.json({ compras: formattedCompras });
  } catch (error: any) {
    console.error("Error reading compras:", error);
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
