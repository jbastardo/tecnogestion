import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'extracted_data.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: "extracted_data.json no encontrado" }, { status: 404 });
    }
    
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const db = JSON.parse(fileContent);

    // 1. Seed Métodos de Pago
    const metodosRaw = [...new Set([
      ...db.gastos.map((g: any) => g["T / P"] || "N/A"),
      ...db.compras.map((c: any) => c["T/P"] || "N/A"),
      ...db.cuentasPorCobrar.map((c: any) => c["T / P"] || "N/A")
    ])];
    
    const metodos = await Promise.all(metodosRaw.map(async (m: any) => {
      return prisma.metodoPago.upsert({
        where: { nombre: String(m).trim() },
        update: {},
        create: { nombre: String(m).trim() }
      });
    }));

    // 2. Seed Categorías de Gasto
    const categoriasGastoRaw = [...new Set(db.gastos.map((g: any) => g["TIPO DE GASTOS"] || "General"))];
    const categoriasGasto = await Promise.all(categoriasGastoRaw.map(async (c: any) => {
      return prisma.categoriaGasto.upsert({
        where: { nombre: String(c).trim() },
        update: {},
        create: { nombre: String(c).trim() }
      });
    }));

    // 3. Seed Proveedores
    const proveedoresRaw = [...new Set([
      ...db.gastos.map((g: any) => g["PROVEEDOR"] || "Desconocido"),
      ...db.compras.map((c: any) => c["PROVEEDOR"] || "Desconocido")
    ])];
    const proveedores = await Promise.all(proveedoresRaw.map(async (p: any) => {
      return prisma.proveedor.upsert({
        where: { nombre: String(p).trim() },
        update: {},
        create: { nombre: String(p).trim() }
      });
    }));

    // 4. Seed Cuentas por Cobrar
    if (db.cuentasPorCobrar && db.cuentasPorCobrar.length > 0) {
      await prisma.cuentaPorCobrar.deleteMany({});
      for (const cuenta of db.cuentasPorCobrar) {
        await prisma.cuentaPorCobrar.create({
          data: {
            cliente: cuenta["CLIENTE/DESCRIPCION"] || "Sin nombre",
            referencia: cuenta["Nº DE F.T"] || cuenta["Nº NOTA DE E."] || "",
            montoTotal: parseFloat(cuenta["MONTO $"] || 0),
            importeAdeudado: parseFloat(cuenta["SALDO AL "] || 0),
            observaciones: cuenta["OBSERVACION"] || "",
          }
        });
      }
    }
    // 5. Seed Gastos
    if (db.gastos && db.gastos.length > 0) {
      await prisma.gasto.deleteMany({});
      for (const gasto of db.gastos) {
        // Encontrar IDs foráneos
        const prov = proveedores.find(p => p.nombre === String(gasto["PROVEEDOR"] || "Desconocido").trim());
        const cat = categoriasGasto.find(c => c.nombre === String(gasto["TIPO DE GASTOS"] || "General").trim());
        const met = metodos.find(m => m.nombre === String(gasto["T / P"] || "N/A").trim());
        
        let parsedDate = new Date();
        if (gasto["FECHA"]) {
            // Excel dates are usually numbers (serial dates)
            if (typeof gasto["FECHA"] === 'number') {
                parsedDate = new Date(Math.round((gasto["FECHA"] - 25569) * 86400 * 1000));
            } else {
                parsedDate = new Date(gasto["FECHA"])
                if (isNaN(parsedDate.getTime())) parsedDate = new Date();
            }
        }

        await prisma.gasto.create({
          data: {
            fecha: parsedDate,
            proveedorId: prov?.id || proveedores[0].id,
            categoriaId: cat?.id || categoriasGasto[0].id,
            metodoPagoId: met?.id || metodos[0].id,
            concepto: gasto["CONCEPTO"] || "Sin concepto",
            notaEntrega: gasto["NOTA DE ENTREGA"] || gasto["Nº NOTA DE E."] || "",
            exento: parseFloat(gasto["EXENTO"] || 0),
            baseImponible: parseFloat(gasto["BASE IMPONIBLE"] || 0),
            iva: parseFloat(gasto["IVA"] || 0),
            totalAPagar: parseFloat(gasto["A PAGAR"] || gasto["TOTAL A PAGAR"] || 0),
            estadoPago: "Pagado"
          }
        });
      }
    }

    // 6. Seed Compras
    const categoriasCompraRaw = [...new Set(db.compras.map((c: any) => c["TIPO DE COMPRA"] || "General"))];
    const categoriasCompra = await Promise.all(categoriasCompraRaw.map(async (c: any) => {
      return prisma.categoriaCompra.upsert({
        where: { nombre: String(c).trim() },
        update: {},
        create: { nombre: String(c).trim() }
      });
    }));

    if (db.compras && db.compras.length > 0) {
      await prisma.compra.deleteMany({});
      for (const compra of db.compras) {
        const prov = proveedores.find(p => p.nombre === String(compra["PROVEEDOR"] || "Desconocido").trim());
        const cat = categoriasCompra.find(c => c.nombre === String(compra["TIPO DE COMPRA"] || "General").trim());
        const met = metodos.find(m => m.nombre === String(compra["T/P"] || compra["T / P"] || "N/A").trim());
        
        let parsedDate = new Date();
        if (compra["FECHA  FACTURA"]) {
            if (typeof compra["FECHA  FACTURA"] === 'number') {
                parsedDate = new Date(Math.round((compra["FECHA  FACTURA"] - 25569) * 86400 * 1000));
            } else {
                parsedDate = new Date(compra["FECHA  FACTURA"])
                if (isNaN(parsedDate.getTime())) parsedDate = new Date();
            }
        }

        await prisma.compra.create({
          data: {
            fechaFactura: parsedDate,
            proveedorId: prov?.id || proveedores[0].id,
            categoriaId: cat?.id || categoriasCompra[0].id,
            metodoPagoId: met?.id || metodos[0].id,
            notaEntrega: compra["NOTA DE ENTREGA"] || "",
            exento: parseFloat(compra["EXENTO"] || 0),
            baseImponible: parseFloat(compra["BASE IMPONIBLE"] || 0),
            iva: parseFloat(compra["IVA"] || 0),
            totalAPagar: parseFloat(compra["A PAGAR"] || 0),
            estadoPago: "Pagado",
            observaciones: compra["OBSERVACIONES"] || ""
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Base de datos migrada exitosamente desde el Excel.",
      stats: {
        proveedores: proveedores.length,
        metodos: metodos.length,
        categorias: categoriasGasto.length
      }
    });

  } catch (error: any) {
    console.error("Error migrating data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
