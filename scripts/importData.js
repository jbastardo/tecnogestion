const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

function readExcelFiles() {
  console.log("Iniciando la lectura de archivos Excel...");
  
  const files = [
    "JULIO 2026.xlsx",
    "CASHEA_GLOBAL IT SYSTEM, C. A._202607.xls",
    "CONTROL DE CAJA ADMON 2026.xls"
  ];

  const dbData = {
    ingresos: [],
    compras: [],
    gastos: [],
    cuentasPorCobrar: []
  };

  files.forEach(fileName => {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`[!] Archivo no encontrado: ${fileName}`);
      return;
    }

    console.log(`[+] Leyendo ${fileName}...`);
    const workbook = xlsx.readFile(filePath);

    if (fileName === "JULIO 2026.xlsx") {
      // Leer INGRESOS
      const sheetIngresos = workbook.Sheets["INGRESOS"];
      if (sheetIngresos) {
        const ingresosJson = xlsx.utils.sheet_to_json(sheetIngresos, { range: 4 }); // Asumiendo fila 5
        dbData.ingresos = ingresosJson;
        console.log(`    -> INGRESOS: ${ingresosJson.length} registros extraidos.`);
      }

      // Leer COMPRAS
      const sheetCompras = workbook.Sheets["COMPRAS FACT "];
      if (sheetCompras) {
        const comprasJson = xlsx.utils.sheet_to_json(sheetCompras, { range: 5 }); 
        dbData.compras = comprasJson;
        console.log(`    -> COMPRAS: ${comprasJson.length} registros extraidos.`);
      }

      // Leer GASTOS
      const sheetGastos = workbook.Sheets["GASTOS"];
      if (sheetGastos) {
        const gastosJson = xlsx.utils.sheet_to_json(sheetGastos, { range: 3 }); 
        dbData.gastos = gastosJson;
        console.log(`    -> GASTOS: ${gastosJson.length} registros extraidos.`);
      }
    } else if (fileName.includes("CASHEA")) {
      // Lógica específica para Cashea
      const sheetCashea = workbook.Sheets[workbook.SheetNames[0]];
      if (sheetCashea) {
        const data = xlsx.utils.sheet_to_json(sheetCashea);
        dbData.cuentasPorCobrar.push(...data);
        console.log(`    -> CASHEA: ${data.length} registros extraidos.`);
      }
    }
  });

  // Aquí iría la lógica de inserción en Base de Datos (Prisma)
  console.log("\n[SUCCESS] Extracción completada. Los datos están listos para ser inyectados en la base de datos.");
  
  // Opcional: Escribir a un archivo JSON para depurar
  const outputPath = path.join(process.cwd(), "extracted_data.json");
  fs.writeFileSync(outputPath, JSON.stringify(dbData, null, 2));
  console.log(`Resultados guardados temporalmente en: ${outputPath}`);
}

readExcelFiles();
