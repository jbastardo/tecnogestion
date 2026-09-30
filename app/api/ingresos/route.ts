import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const ingresos = await prisma.ingreso.findMany({
      orderBy: { fecha: 'desc' },
      include: { metodoPago: true }
    });

    const formattedIngresos = ingresos.map((ingreso) => ({
      id: ingreso.id,
      fecha: ingreso.fecha.toISOString().split('T')[0],
      baseImponibleZ: ingreso.reporteZ,
      ivaZ: ingreso.iva,
      igtfZ: ingreso.igtf,
      notasEntrega: ingreso.notasEntrega,
      efectivoBs: ingreso.efectivoBolivares,
      bancos: ingreso.bancos,
      usd: ingreso.monedaExtranjera,
      zelle: ingreso.zelle,
      binance: ingreso.binance,
    }));

    return NextResponse.json({ ingresos: formattedIngresos });
  } catch (error) {
    console.error("Error reading ingresos:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      fecha, baseImponibleZ, ivaZ, igtfZ, notasEntrega, 
      efectivoBs, bancos, usd, zelle, binance, metodoPago 
    } = body;

    let metodoPagoId = null;
    if (metodoPago) {
      const metodo = await prisma.metodoPago.upsert({
        where: { nombre: String(metodoPago).trim() },
        update: {},
        create: { nombre: String(metodoPago).trim() }
      });
      metodoPagoId = metodo.id;
    }

    const nuevoIngreso = await prisma.ingreso.create({
      data: {
        fecha: new Date(fecha),
        reporteZ: Number(baseImponibleZ) || 0,
        iva: Number(ivaZ) || 0,
        igtf: Number(igtfZ) || 0,
        notasEntrega: Number(notasEntrega) || 0,
        efectivoBolivares: Number(efectivoBs) || 0,
        bancos: Number(bancos) || 0,
        monedaExtranjera: Number(usd) || 0,
        zelle: Number(zelle) || 0,
        binance: Number(binance) || 0,
        metodoPagoId,
      }
    });

    return NextResponse.json({ success: true, ingreso: nuevoIngreso });
  } catch (error: any) {
    console.error("Error creating ingreso:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await prisma.ingreso.delete({ where: { id: String(id) } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting ingreso:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
