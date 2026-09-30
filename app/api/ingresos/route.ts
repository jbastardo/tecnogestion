import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const ingresos = await prisma.ingreso.findMany({
      orderBy: { fecha: 'desc' },
      include: { metodoPago: true }
    });

    const formattedIngresos = ingresos.map((ingreso) => ({
      id: ingreso.id,
      fecha: ingreso.fecha.toISOString().split('T')[0],
      reporteZ: ingreso.reporteZ,
      notasEntrega: ingreso.notasEntrega,
      igtf: ingreso.igtf,
      efectivoBs: ingreso.efectivoBolivares,
      bancos: ingreso.bancos,
      zelle: ingreso.zelle,
      binance: ingreso.binance,
      baseImponible: ingreso.baseImponible,
      iva: ingreso.iva,
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
      fecha, reporteZ, notasEntrega, igtf, 
      efectivoBs, bancos, zelle, binance, baseImponible, iva, metodoPago 
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
        reporteZ: Number(reporteZ) || 0,
        notasEntrega: Number(notasEntrega) || 0,
        igtf: Number(igtf) || 0,
        efectivoBolivares: Number(efectivoBs) || 0,
        bancos: Number(bancos) || 0,
        zelle: Number(zelle) || 0,
        binance: Number(binance) || 0,
        baseImponible: Number(baseImponible) || 0,
        iva: Number(iva) || 0,
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
