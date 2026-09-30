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
      ...db.gastos.slice(1).map((g: any) => g[" T / P "] || "N/A"),
      ...db.compras.slice(2).map((c: any) => c["__EMPTY_15"] || "N/A"),
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
    const categoriasGastoRaw = [...new Set(db.gastos.slice(1).map((g: any) => g["TIPO DE GASTOS"] || "General"))];
    const categoriasGasto = await Promise.all(categoriasGastoRaw.map(async (c: any) => {
      return prisma.categoriaGasto.upsert({
        where: { nombre: String(c).trim() },
        update: {},
        create: { nombre: String(c).trim() }
      });
    }));

    // 3. Seed Proveedores
    const proveedoresRaw = [...new Set([
      ...db.gastos.slice(1).map((g: any) => g["PROVEEDOR"] || "Desconocido"),
      ...db.compras.slice(2).map((c: any) => c["__EMPTY_2"] || "Desconocido")
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
        if (!cuenta["CLIENTE/DESCRIPCION"]) continue;
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
    if (db.gastos && db.gastos.length > 1) {
      await prisma.gasto.deleteMany({});
      const dataRows = db.gastos.filter((g: any) => g["IT"] && typeof g["IT"] === 'number');
      for (const gasto of dataRows) {
        const prov = proveedores.find((p: any) => p.nombre === String(gasto["PROVEEDOR"] || "Desconocido").trim());
        const cat = categoriasGasto.find((c: any) => c.nombre === String(gasto["TIPO DE GASTOS"] || "General").trim());
        const met = metodos.find((m: any) => m.nombre === String(gasto[" T / P "] || "N/A").trim());
        
        let parsedDate = new Date();
        if (gasto["FECHA"] && typeof gasto["FECHA"] === 'number') {
            parsedDate = new Date(Math.round((gasto["FECHA"] - 25569) * 86400 * 1000));
        }

        await prisma.gasto.create({
          data: {
            fecha: parsedDate,
            proveedorId: prov?.id || proveedores[0].id,
            categoriaId: cat?.id || categoriasGasto[0].id,
            metodoPagoId: met?.id || metodos[0].id,
            concepto: String(gasto["CONCEPTO"] || "Sin concepto"),
            iva: parseFloat(gasto["IVA"] || 0),
            totalAPagar: parseFloat(gasto["A PAGAR"] || 0),
            estadoPago: "Pagado"
          }
        });
      }
    }

    // 6. Seed Compras
    const categoriasCompraRaw = [...new Set(db.compras.slice(2).map((c: any) => c["__EMPTY_3"] || "General"))];
    const categoriasCompra = await Promise.all(categoriasCompraRaw.map(async (c: any) => {
      return prisma.categoriaCompra.upsert({
        where: { nombre: String(c).trim() },
        update: {},
        create: { nombre: String(c).trim() }
      });
    }));

    if (db.compras && db.compras.length > 2) {
      await prisma.compra.deleteMany({});
      const dataRows = db.compras.slice(2).filter((c: any) => c["__EMPTY_2"]);
      for (const compra of dataRows) {
        const prov = proveedores.find((p: any) => p.nombre === String(compra["__EMPTY_2"] || "Desconocido").trim());
        const cat = categoriasCompra.find((c: any) => c.nombre === String(compra["__EMPTY_3"] || "General").trim());
        const met = metodos.find((m: any) => m.nombre === String(compra["__EMPTY_15"] || "N/A").trim());
        
        let parsedDate = new Date();
        if (compra["__EMPTY_1"] && typeof compra["__EMPTY_1"] === 'number') {
            parsedDate = new Date(Math.round((compra["__EMPTY_1"] - 25569) * 86400 * 1000));
        }

        await prisma.compra.create({
          data: {
            fechaFactura: parsedDate,
            proveedorId: prov?.id || proveedores[0].id,
            categoriaId: cat?.id || categoriasCompra[0].id,
            metodoPagoId: met?.id || metodos[0].id,
            notaEntrega: String(compra["__EMPTY_4"] || compra["__EMPTY_5"] || ""),
            exento: parseFloat(compra["__EMPTY_6"] || 0),
            baseImponible: parseFloat(compra["__EMPTY_7"] || 0),
            iva: parseFloat(compra["__EMPTY_8"] || 0),
            totalAPagar: parseFloat(compra["__EMPTY_11"] || 0),
            estadoPago: "Pagado",
            observaciones: String(compra["__EMPTY_18"] || "")
          }
        });
      }
    }

    // 7. Seed Ingresos
    if (db.ingresos && db.ingresos.length > 1) {
      await prisma.ingreso.deleteMany({});
      const dataRows = db.ingresos.slice(1).filter((i: any) => i["__EMPTY"] && typeof i["__EMPTY"] === 'number');
      for (const ingreso of dataRows) {
        let parsedDate = new Date(Math.round((ingreso["__EMPTY"] - 25569) * 86400 * 1000));
        
        await prisma.ingreso.create({
          data: {
            fecha: parsedDate,
            reporteZ: parseFloat(ingreso["REPORTE Z"] || 0),
            notasEntrega: parseFloat(ingreso["NOTAS DE ENTREGA"] || 0),
            igtf: parseFloat(ingreso["IGTF"] || 0),
            efectivoBolivares: parseFloat(ingreso["EFECTIVO  BOLIVARES"] || 0),
            bancos: parseFloat(ingreso["BANCOS"] || 0),
            monedaExtranjera: parseFloat(ingreso["MONEDA EXTRANJERA"] || 0),
            zelle: parseFloat(ingreso["__EMPTY_2"] || 0),
            binance: parseFloat(ingreso["__EMPTY_3"] || 0),
            tasaCambio: parseFloat(ingreso["TASA DE CAMBIO"] || 1),
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Base de datos migrada exitosamente desde el Excel con mapeo exacto de llaves.",
      stats: {
        proveedores: proveedores.length,
        metodos: metodos.length,
        categoriasGastos: categoriasGasto.length,
        categoriasCompras: categoriasCompra.length
      }
    });

  } catch (error: any) {
    console.error("Error migrating data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
