const xlsx = require('xlsx');
const workbook = xlsx.readFile('JULIO 2026.xlsx');

function showSheet(name, startRow, numRows) {
    console.log(`\n--- ${name} ---`);
    const sheet = workbook.Sheets[name];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    for (let i = startRow; i < startRow + numRows; i++) {
        if(data[i]) console.log(data[i]);
    }
}

showSheet('INGRESOS', 1, 5);
showSheet('COMPRAS FACT', 2, 5);
showSheet('GASTOS ', 2, 5);
showSheet('CUENTAS POR COBRAR', 1, 5);
