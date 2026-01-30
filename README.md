# Grocery Manager - Angular 19 App

An Angular 19 web application to manage grocery data from Google Sheets with search, pagination, and export functionality.

## Features

- 📊 Load data from Google Sheets
- 🔍 Search functionality across all columns
- 📄 Pagination with customizable items per page
- ✅ Row selection with checkboxes
- 💾 Export data to Excel file
- 📱 Responsive design for desktop and mobile
- 🎨 Modern UI with gradient header

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Angular CLI 19

## Installation

1. **Install Angular CLI** (if not already installed):
```bash
npm install -g @angular/cli@19
```

2. **Install dependencies**:
```bash
npm install
```

3. **Install XLSX package** (if not included):
```bash
npm install xlsx --save
npm install @types/node --save-dev
```

## Configuration

The app is pre-configured to load data from the Google Sheet:
- Sheet ID: `1_k8a4r6HNg96bT49IHOPmHDWRJPcKp_WdpNKeJ6pVEA`
- Export URL is automatically generated in the component

### CORS Considerations

Google Sheets direct export may face CORS restrictions. Solutions:

1. **Use a CORS proxy** (for development):
   ```typescript
   private exportUrl = `https://cors-anywhere.herokuapp.com/https://docs.google.com/spreadsheets/d/${this.googleSheetId}/export?format=xlsx&gid=${this.googleSheetGid}`;
   ```

2. **Backend proxy** (recommended for production):
   - Create a backend endpoint that fetches the sheet
   - Call your backend from the Angular app

3. **Local file**: Place an Excel file in `src/assets/` folder and load it locally

## Running the Application

1. **Development server**:
```bash
npm start
```
or
```bash
ng serve
```

Navigate to `http://localhost:4200/`

2. **Build for production**:
```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

```
grocery-manager/
├── src/
│   ├── app/
│   │   ├── app.component.ts       # Main component logic
│   │   ├── app.component.html     # Template
│   │   ├── app.component.css      # Styles
│   │   └── app.module.ts          # Module configuration
│   ├── assets/                    # Static files
│   └── index.html
├── package.json
└── README.md
```

## Usage

1. **Search**: Type in the search box to filter data across all columns
2. **Select Rows**: Click checkboxes to select individual rows or use the header checkbox to select all
3. **Pagination**: Navigate through pages using the pagination controls
4. **Save**: Click the Save button to download the current data as an Excel file
5. **Exit**: Click the Exit button to close the application

## Customization

### Change items per page:
Edit `itemsPerPage` in [app.component.ts](src/app/app.component.ts):
```typescript
itemsPerPage: number = 10; // Change to desired number
```

### Change Google Sheet:
Update the IDs in [app.component.ts](src/app/app.component.ts):
```typescript
private googleSheetId = 'YOUR_SHEET_ID';
private googleSheetGid = 'YOUR_GID';
```

## Troubleshooting

### CORS Error
If you encounter CORS errors when loading from Google Sheets:
- Use a CORS proxy for development
- Implement a backend proxy for production
- Or download the sheet and place it in `src/assets/`

### Module Not Found Error
If you get "Cannot find module 'xlsx'":
```bash
npm install xlsx --save
```

### TypeScript Errors
Add to `tsconfig.json` if needed:
```json
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

## License

MIT

## Support

For issues or questions, please create an issue in the repository.
