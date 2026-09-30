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
    const categoriasGastoRaw = [...new Set(db.gastos.map((g: any) => g["TIPO DE GASTO "] || "General"))];
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
