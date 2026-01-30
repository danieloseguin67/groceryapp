const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Save endpoint
app.post('/api/save', (req, res) => {
  try {
    const data = req.body;
    const filePath = path.join(__dirname, 'src', 'assets', 'grocery-data.json');
    
    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log('✅ Data saved successfully to grocery-data.json');
    res.json({ success: true, message: 'Data saved successfully!' });
  } catch (error) {
    console.error('❌ Error saving data:', error);
    res.status(500).json({ success: false, message: 'Failed to save data', error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Save server is running' });
});

app.listen(PORT, () => {
  console.log(`📁 File save server running on http://localhost:${PORT}`);
  console.log(`🔧 Ready to save data to src/assets/grocery-data.json`);
});
