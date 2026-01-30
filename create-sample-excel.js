const XLSX = require('xlsx');

// Sample grocery data
const sampleData = [
  { Item: 'Apples', Category: 'Fruits', Quantity: 10, Unit: 'kg', Price: 2.99, InStock: 'Yes' },
  { Item: 'Bananas', Category: 'Fruits', Quantity: 15, Unit: 'kg', Price: 1.49, InStock: 'Yes' },
  { Item: 'Carrots', Category: 'Vegetables', Quantity: 8, Unit: 'kg', Price: 1.99, InStock: 'Yes' },
  { Item: 'Milk', Category: 'Dairy', Quantity: 20, Unit: 'liters', Price: 3.49, InStock: 'Yes' },
  { Item: 'Bread', Category: 'Bakery', Quantity: 12, Unit: 'loaves', Price: 2.49, InStock: 'Yes' },
  { Item: 'Eggs', Category: 'Dairy', Quantity: 30, Unit: 'dozen', Price: 4.99, InStock: 'Yes' },
  { Item: 'Chicken', Category: 'Meat', Quantity: 5, Unit: 'kg', Price: 8.99, InStock: 'Yes' },
  { Item: 'Rice', Category: 'Grains', Quantity: 25, Unit: 'kg', Price: 12.99, InStock: 'Yes' },
  { Item: 'Pasta', Category: 'Grains', Quantity: 18, Unit: 'boxes', Price: 1.99, InStock: 'Yes' },
  { Item: 'Tomatoes', Category: 'Vegetables', Quantity: 12, Unit: 'kg', Price: 2.79, InStock: 'Yes' },
  { Item: 'Cheese', Category: 'Dairy', Quantity: 8, Unit: 'kg', Price: 6.99, InStock: 'Yes' },
  { Item: 'Orange Juice', Category: 'Beverages', Quantity: 15, Unit: 'liters', Price: 4.49, InStock: 'Yes' },
  { Item: 'Coffee', Category: 'Beverages', Quantity: 10, Unit: 'kg', Price: 15.99, InStock: 'Yes' },
  { Item: 'Sugar', Category: 'Baking', Quantity: 20, Unit: 'kg', Price: 1.79, InStock: 'Yes' },
  { Item: 'Flour', Category: 'Baking', Quantity: 22, Unit: 'kg', Price: 2.29, InStock: 'Yes' }
];

// Create a new workbook
const workbook = XLSX.utils.book_new();

// Convert JSON to worksheet
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

// Write to file
XLSX.writeFile(workbook, 'src/assets/grocery-data.xlsx');

console.log('✅ Sample grocery-data.xlsx created successfully in src/assets/');
