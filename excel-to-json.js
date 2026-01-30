const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const workbook = XLSX.readFile('src/assets/grocery-data.xlsx');

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const jsonData = XLSX.utils.sheet_to_json(worksheet);

// Write to JSON file
fs.writeFileSync('src/assets/grocery-data.json', JSON.stringify(jsonData, null, 2));

console.log('✅ Successfully converted grocery-data.xlsx to grocery-data.json');
console.log(`📊 Total records: ${jsonData.length}`);
