import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'extracted_data.json');
    
    // Si no existe aún el JSON exportado, enviamos datos por defecto para que no falle
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({
        ingresosTotales: 0,
        gastosTotales: 0,
        fondoCaja: 0,
        margenNeto: 0,
        graficoMensual: [],
        graficoMetodosPago: []
      });
    }

    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const db = JSON.parse(fileContent);

    // Calcular totales reales a partir del JSON extraído del Excel
    let ingresosTotales = 0;
    const metodoPagoTotales: Record<string, number> = {
      Efectivo: 0,
      Zelle: 0,
      Binance: 0,
      "TDD/Bancos": 0,
      IGTF: 0,
    };

    db.ingresos.forEach((ingreso: any) => {
      // Sumar al total general
      const base = parseFloat(ingreso["BASE IMPONIBLE"] || 0);
      const iva = parseFloat(ingreso["IVA"] || 0);
      ingresosTotales += (base + iva);

      // Sumar por métodos de pago
      metodoPagoTotales.Efectivo += parseFloat(ingreso["EFECTIVO Bs."] || 0);
      metodoPagoTotales.Zelle += parseFloat(ingreso["ZELLE"] || 0);
      metodoPagoTotales.Binance += parseFloat(ingreso["BINANCE"] || 0);
      metodoPagoTotales["TDD/Bancos"] += parseFloat(ingreso["BANCOS"] || 0);
      metodoPagoTotales.IGTF += parseFloat(ingreso["IGTF"] || 0);
    });

    const graficoMetodosPago = Object.entries(metodoPagoTotales)
      .filter(([_, value]) => value > 0)
      .map(([name, ventas]) => ({ name, ventas: Math.round(ventas) }));

    // Mock para los meses, usando el total real de Julio en la última barra
    const graficoMensual = [
      { name: "Ene", ingresos: 4000, gastos: 2400 },
      { name: "Feb", ingresos: 3000, gastos: 1398 },
      { name: "Mar", ingresos: 2000, gastos: 9800 },
      { name: "Abr", ingresos: 2780, gastos: 3908 },
      { name: "May", ingresos: 1890, gastos: 4800 },
      { name: "Jun", ingresos: 2390, gastos: 3800 },
      { name: "Jul", ingresos: Math.round(ingresosTotales), gastos: 4300 }, // Dato Real inyectado
    ];

    return NextResponse.json({
      ingresosTotales,
      gastosTotales: 12234.50, // Hardcoded temporal hasta procesar la hoja de gastos
      fondoCaja: 8543.00,
      margenNeto: 72.9,
      graficoMensual,
      graficoMetodosPago
    });
  } catch (error) {
    console.error("Error leyendo dashboard data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
