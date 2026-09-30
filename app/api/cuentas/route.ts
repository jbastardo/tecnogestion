import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cuentas = await prisma.cuentaPorCobrar.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const formattedCuentas = cuentas.map((cuenta) => ({
      id: cuenta.id,
      fecha: cuenta.createdAt.toISOString().split('T')[0],
      notaEntrega: cuenta.referencia || "",
      numeroFactura: cuenta.referencia || "",
      descripcion: cuenta.cliente || "Sin cliente",
      metodoPago: "N/A",
      monto: cuenta.montoTotal,
      abono: cuenta.montoTotal - cuenta.importeAdeudado,
      saldo: cuenta.importeAdeudado,
      estado: cuenta.importeAdeudado <= 0 ? "Pagado" : "Pendiente",
    }));

    return NextResponse.json({ cuentasPorCobrar: formattedCuentas });
  } catch (error) {
    console.error("Error reading cuentas:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cliente, referencia, montoTotal, abono, observaciones } = body;

    const saldo = Number(montoTotal) - Number(abono || 0);

    const nuevaCuenta = await prisma.cuentaPorCobrar.create({
      data: {
        cliente: cliente || "Sin cliente",
        referencia: referencia || "",
        montoTotal: Number(montoTotal) || 0,
        importeAdeudado: saldo,
        observaciones: observaciones || "",
      }
    });

    return NextResponse.json({ success: true, cuenta: nuevaCuenta });
  } catch (error: any) {
    console.error("Error creating cuenta:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await prisma.cuentaPorCobrar.delete({ where: { id: String(id) } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting cuenta:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
