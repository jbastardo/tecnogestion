const xlsx = require('xlsx');
const path = process.argv[2];
const workbook = xlsx.readFile(path);
const sheetNames = workbook.SheetNames;

console.log('=== EXCEL SHEETS ===');
console.log(sheetNames);

sheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (data.length === 0) {
        console.log('Empty sheet');
        return;
    }
    
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(10, data.length); i++) {
        if (data[i] && data[i].length > 0 && data[i].some(cell => cell)) {
            headerRowIdx = i;
            break;
        }
    }
    
    console.log(`Possible Headers (Row ${headerRowIdx + 1}):`);
    console.log(data[headerRowIdx]);
    
    console.log('Sample Data (First row after headers):');
    if (data.length > headerRowIdx + 1) {
        console.log(data[headerRowIdx + 1]);
    }
});
