import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const gastosData = await prisma.gasto.findMany({
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
      id: gasto.id,
      fecha: gasto.fecha.toISOString().split('T')[0],
      concepto: gasto.concepto,
      tipoGasto: gasto.categoria?.nombre || "N/A",
      notaEntrega: gasto.notaEntrega || "",
      exento: gasto.exento,
      baseImponible: gasto.baseImponible,
      iva: gasto.iva,
      totalPagar: gasto.totalAPagar,
      metodoPago: gasto.metodoPago?.nombre || "N/A",
      status: gasto.estadoPago,
      proveedor: gasto.proveedor?.nombre || "N/A"
    }));

    return NextResponse.json({ gastos: formattedGastos });
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
