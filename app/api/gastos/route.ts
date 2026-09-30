import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'extracted_data.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ gastos: [] });
    }
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const db = JSON.parse(fileContent);

    // Format the date or fix empty fields
    const formattedGastos = db.gastos.map((item: any, index: number) => ({
      id: index,
      fecha: item["FECHA"] || "",
      concepto: item["CONCEPTO"] || "Sin concepto",
      tipoGasto: item["TIPO DE GASTO "] || "N/A",
      notaEntrega: item["Nº NOTA DE E."] || "",
      exento: parseFloat(item["EXENTO"] || 0),
      baseImponible: parseFloat(item["BASE IMPONIBLE"] || 0),
      iva: parseFloat(item["IVA"] || 0),
      totalPagar: parseFloat(item["TOTAL A PAGAR"] || 0),
      metodoPago: item["T / P"] || "N/A",
      status: "Pagado",
    }));

    return NextResponse.json({ gastos: formattedGastos });
  } catch (error) {
    console.error("Error reading gastos:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
