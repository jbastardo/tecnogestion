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
    
    // Simplistic creation for now (you'd ideally validate this)
    const nuevoGasto = await prisma.gasto.create({
      data: {
        fecha: new Date(body.fecha),
        concepto: body.concepto,
        proveedorId: body.proveedorId,
        categoriaId: body.categoriaId,
        totalAPagar: body.totalPagar,
        estadoPago: body.status || "POR PAGAR"
      }
    });

    return NextResponse.json({ success: true, gasto: nuevoGasto });
  } catch (error: any) {
    console.error("Error creating gasto:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
