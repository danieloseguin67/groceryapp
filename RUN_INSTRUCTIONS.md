# Running the Grocery Manager App

The app now has a backend server to save data directly to the JSON file.

## How to Run

**Option 1: Run both servers together (Recommended)**
```bash
npm run dev
```
This starts both the Angular dev server and the file save server.

**Option 2: Run separately**

Terminal 1 - Backend save server:
```bash
npm run server
```

Terminal 2 - Angular app:
```bash
npm start
```

## Features

- ✅ Save button now writes directly to `src/assets/grocery-data.json`
- ✅ Changes persist automatically - no need to manually replace files
- ✅ Page auto-refreshes to show saved data

## Ports

- **Angular App**: http://localhost:4200 (or auto-assigned)
- **Save Server**: http://localhost:3000
