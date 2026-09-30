import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'extracted_data.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ compras: [] });
    }
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const db = JSON.parse(fileContent);

    // Format the date or fix empty fields
    const formattedCompras = db.compras.map((item: any, index: number) => ({
      id: index,
      fecha: item["FECHA FAC."] || "",
      proveedor: item["PROVEEDOR"] || "Sin proveedor",
      notaEntrega: item["Nº NOTA DE E."] || "",
      numeroFactura: item["Nº F. T"] || "",
      exento: parseFloat(item["EXENTO"] || 0),
      baseImponible: parseFloat(item["BASE IMPONIBLE"] || 0),
      iva: parseFloat(item["IVA"] || 0),
      totalPagar: parseFloat(item["TOTAL A PAGAR"] || 0),
      metodoPago: item["T/P"] || "N/A",
      estadoPago: item["PAGADO O POR PAGAR"] || "N/A",
    }));

    return NextResponse.json({ compras: formattedCompras });
  } catch (error) {
    console.error("Error reading compras:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
