import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const ordenes = await prisma.ordenPago.findMany({
      include: {
        metodoPago: true,
        solicitadoPor: true,
        aprobadoPor: true,
        ejecutadoPor: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ ordenes });
  } catch (error: any) {
    console.error("Error fetching ordenes:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Obtener usuario mock por ahora
    let usuario = await prisma.usuario.findFirst({ where: { rol: "ADMINISTRATIVO" } });
    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          nombre: "Admin Sistema",
          email: "admin@sistema.local",
          password: "mockpassword",
          rol: "ADMINISTRATIVO"
        }
      });
    }

    const nuevaOrden = await prisma.ordenPago.create({
      data: {
        concepto: body.concepto,
        montoBs: parseFloat(body.montoBs || 0),
        montoUsd: parseFloat(body.montoUsd || 0),
        gastoRef: body.gastoRef,
        proveedorNombre: body.proveedorNombre,
        solicitadoPorId: usuario.id,
        estado: body.estado || "SOLICITADA",
      }
    });

    return NextResponse.json({ success: true, orden: nuevaOrden });
  } catch (error: any) {
    console.error("Error creating orden:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    
    // Obtener usuario mock por ahora
    let usuario = await prisma.usuario.findFirst({ where: { rol: "ADMINISTRATIVO" } });

    const dataToUpdate: any = {
      estado: body.estado,
      comprobanteRef: body.comprobanteRef,
    };

    if (body.estado === "APROBADA") {
      dataToUpdate.aprobadoPorId = usuario?.id;
    } else if (body.estado === "EJECUTADA") {
      dataToUpdate.ejecutadoPorId = usuario?.id;
      dataToUpdate.fechaEjecucion = new Date();
      // Enlazar método de pago si viene
      if (body.metodoPagoNombre) {
        const metodo = await prisma.metodoPago.upsert({
          where: { nombre: body.metodoPagoNombre.trim() },
          update: {},
          create: { nombre: body.metodoPagoNombre.trim() }
        });
        dataToUpdate.metodoPagoId = metodo.id;
      }
    }

    const orden = await prisma.ordenPago.update({
      where: { id: body.id },
      data: dataToUpdate
    });

    // Si fue ejecutada, registrar automáticamente en Caja/Bancos como EGRESO
    if (body.estado === "EJECUTADA" && body.cajaId) {
      await prisma.movimientoCaja.create({
        data: {
          cajaId: body.cajaId,
          tipo: "EGRESO",
          concepto: `Pago a Prov: ${orden.proveedorNombre || 'N/A'} - ${orden.concepto}`,
          montoUsd: orden.montoUsd,
          montoBs: orden.montoBs,
          tasaCambio: (orden.montoBs > 0 && orden.montoUsd > 0) ? (orden.montoBs / orden.montoUsd) : 1,
          usuarioId: usuario?.id
        }
      });
      
      // Si el gasto original fue local, marcarlo como PAGADO
      if (orden.gastoRef && orden.gastoRef.startsWith("local_")) {
        await prisma.gasto.update({
          where: { id: orden.gastoRef.replace("local_", "") },
          data: { estadoPago: "PAGADO" }
        });
      }
      // Nota: Para gastos "odoo_", el pago se registra en Odoo (o se asume pagado vía este sistema).
    }

    return NextResponse.json({ success: true, orden });
  } catch (error: any) {
    console.error("Error updating orden:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
