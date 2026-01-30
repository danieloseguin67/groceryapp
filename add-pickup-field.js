const fs = require('fs');

// Read the JSON file
const data = JSON.parse(fs.readFileSync('src/assets/grocery-data.json', 'utf8'));

// Add "Picked Up" field to each item
const updated = data.map(item => ({
  ...item,
  'Picked Up': false
}));

// Write back to file
fs.writeFileSync('src/assets/grocery-data.json', JSON.stringify(updated, null, 2));

console.log(`✅ Added "Picked Up" field to all ${data.length} items`);
