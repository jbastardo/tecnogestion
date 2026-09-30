import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'extracted_data.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ cuentasPorCobrar: [] });
    }
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const db = JSON.parse(fileContent);

    // Format the data
    const formattedCuentas = db.cuentasPorCobrar.map((item: any, index: number) => ({
      id: index,
      fecha: item["FECHA"] || "",
      notaEntrega: item["Nº NOTA DE E."] || "",
      numeroFactura: item["Nº DE F.T"] || "",
      descripcion: item["CLIENTE/DESCRIPCION"] || "Sin cliente",
      metodoPago: item["T / P"] || "N/A",
      monto: parseFloat(item["MONTO $"] || 0),
      abono: parseFloat(item["ABONO "] || 0),
      saldo: parseFloat(item["SALDO AL "] || 0),
      estado: parseFloat(item["SALDO AL "] || 0) <= 0 ? "Pagado" : "Pendiente",
    }));

    return NextResponse.json({ cuentasPorCobrar: formattedCuentas });
  } catch (error) {
    console.error("Error reading cuentas:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
