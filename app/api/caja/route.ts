import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cajaId = searchParams.get('cajaId') || 'boveda';
    const action = searchParams.get('action'); // 'resumen', 'movimientos', 'cuadres'
    
    // Obtener la caja activa del día o la última abierta
    const cajaAbierta = await prisma.aperturaCierreCaja.findFirst({
      where: { cajaId, estado: 'ABIERTA' },
      orderBy: { fechaApertura: 'desc' }
    });

    if (action === 'resumen') {
      if (!cajaAbierta) {
        return NextResponse.json({
          estado: 'CERRADA',
          cajaActiva: null,
          resumen: null
        });
      }

      // Sumar ingresos y egresos de la caja abierta
      const movimientos = await prisma.movimientoCaja.findMany({
        where: {
          cajaId,
          fecha: { gte: cajaAbierta.fechaApertura }
        }
      });

      const ingresosUsd = movimientos.filter(m => m.tipo === 'INGRESO').reduce((acc, m) => acc + m.montoUsd, 0);
      const egresosUsd = movimientos.filter(m => m.tipo === 'EGRESO').reduce((acc, m) => acc + m.montoUsd, 0);
      
      const ingresosBs = movimientos.filter(m => m.tipo === 'INGRESO').reduce((acc, m) => acc + m.montoBs, 0);
      const egresosBs = movimientos.filter(m => m.tipo === 'EGRESO').reduce((acc, m) => acc + m.montoBs, 0);

      const saldoActualUsd = cajaAbierta.saldoAperturaUsd + ingresosUsd - egresosUsd;
      const saldoActualBs = cajaAbierta.saldoAperturaBs + ingresosBs - egresosBs;

      return NextResponse.json({
        estado: 'ABIERTA',
        cajaAbierta,
        resumen: {
          ingresosUsd,
          egresosUsd,
          ingresosBs,
          egresosBs,
          saldoActualUsd,
          saldoActualBs
        }
      });
    }

    if (action === 'movimientos') {
      const movimientos = await prisma.movimientoCaja.findMany({
        where: { cajaId },
        orderBy: { fecha: 'desc' },
        take: 100
      });
      return NextResponse.json({ movimientos });
    }

    if (action === 'cuadres') {
      const cuadres = await prisma.aperturaCierreCaja.findMany({
        where: { cajaId, estado: 'CERRADA' },
        orderBy: { fechaCierre: 'desc' },
        take: 50
      });
      return NextResponse.json({ cuadres });
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });

  } catch (error: any) {
    console.error("Error leyendo caja:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, cajaId } = body;

    if (action === 'apertura') {
      // Verificar que no haya una caja abierta
      const cajaAbierta = await prisma.aperturaCierreCaja.findFirst({
        where: { cajaId, estado: 'ABIERTA' }
      });
      if (cajaAbierta) {
        return NextResponse.json({ error: 'La caja ya está abierta' }, { status: 400 });
      }

      const nuevaCaja = await prisma.aperturaCierreCaja.create({
        data: {
          cajaId,
          saldoAperturaUsd: parseFloat(body.saldoAperturaUsd || 0),
          saldoAperturaBs: parseFloat(body.saldoAperturaBs || 0),
          estado: 'ABIERTA'
        }
      });
      return NextResponse.json({ success: true, caja: nuevaCaja });
    }

    if (action === 'movimiento') {
      // Debe haber una caja abierta para registrar un movimiento? 
      // Para la caja chica sí, pero vamos a dejarlo flexible por si acaso.
      const nuevoMovimiento = await prisma.movimientoCaja.create({
        data: {
          cajaId,
          tipo: body.tipo, // INGRESO o EGRESO
          concepto: body.concepto,
          montoUsd: parseFloat(body.montoUsd || 0),
          montoBs: parseFloat(body.montoBs || 0),
        }
      });
      return NextResponse.json({ success: true, movimiento: nuevoMovimiento });
    }

    if (action === 'cierre') {
      const cajaAbierta = await prisma.aperturaCierreCaja.findFirst({
        where: { cajaId, estado: 'ABIERTA' },
        orderBy: { fechaApertura: 'desc' }
      });

      if (!cajaAbierta) {
        return NextResponse.json({ error: 'No hay ninguna caja abierta' }, { status: 400 });
      }

      const cierre = await prisma.aperturaCierreCaja.update({
        where: { id: cajaAbierta.id },
        data: {
          estado: 'CERRADA',
          fechaCierre: new Date(),
          saldoFisicoUsd: parseFloat(body.saldoFisicoUsd || 0),
          saldoFisicoBs: parseFloat(body.saldoFisicoBs || 0),
          saldoSistemaUsd: parseFloat(body.saldoSistemaUsd || 0),
          saldoSistemaBs: parseFloat(body.saldoSistemaBs || 0),
          observaciones: body.observaciones || ""
        }
      });
      return NextResponse.json({ success: true, cierre });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error("Error operando caja:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
