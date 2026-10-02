import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    await prisma.ingreso.deleteMany({});
    await prisma.compra.deleteMany({});
    await prisma.gasto.deleteMany({});
    await prisma.cuentaPorCobrar.deleteMany({});
    await prisma.cuentaPorPagar.deleteMany({});
    await prisma.movimientoCaja.deleteMany({});
    return NextResponse.json({ success: true, message: "Mock data deleted." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
