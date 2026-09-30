import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'extracted_data.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ ingresos: [] });
    }
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const db = JSON.parse(fileContent);

    // Format the date or fix empty fields
    const formattedIngresos = db.ingresos.map((item: any, index: number) => {
      let dateString = "S/F";
      if (item["FECHA"]) {
        if (typeof item["FECHA"] === 'number') {
          const jsDate = new Date(Math.round((item["FECHA"] - 25569) * 86400 * 1000));
          dateString = jsDate.toISOString().split('T')[0];
        } else {
          dateString = String(item["FECHA"]);
        }
      }

      return {
        id: index,
        fecha: dateString,
        reporteZ: parseFloat(item["REPORTE Z "] || 0),
        notasEntrega: parseFloat(item["NOTAS DE ENTREGA"] || 0),
        igtf: parseFloat(item["IGTF"] || 0),
        efectivoBs: parseFloat(item["EFECTIVO Bs."] || 0),
        bancos: parseFloat(item["BANCOS"] || 0),
        zelle: parseFloat(item["ZELLE"] || 0),
        binance: parseFloat(item["BINANCE"] || 0),
        baseImponible: parseFloat(item["BASE IMPONIBLE"] || 0),
        iva: parseFloat(item["IVA"] || 0),
      };
    });

    return NextResponse.json({ ingresos: formattedIngresos });
  } catch (error) {
    console.error("Error reading ingresos:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
