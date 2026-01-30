# Download Google Sheet to Assets

To get your Excel file into the app:

## Option 1: Manual Download (Recommended)

1. Open the Google Sheet: https://docs.google.com/spreadsheets/d/1_k8a4r6HNg96bT49IHOPmHDWRJPcKp_WdpNKeJ6pVEA/edit
2. Click **File → Download → Microsoft Excel (.xlsx)**
3. Save the downloaded file as **grocery-data.xlsx**
4. Copy it to: `src/assets/grocery-data.xlsx`
5. Restart the dev server: `npm start`

## Option 2: Use Direct Download Script

Run this command from the project root:

**Windows PowerShell:**
```powershell
$url = "https://docs.google.com/spreadsheets/d/1_k8a4r6HNg96bT49IHOPmHDWRJPcKp_WdpNKeJ6pVEA/export?format=xlsx&gid=0"
Invoke-WebRequest -Uri $url -OutFile "src/assets/grocery-data.xlsx"
```

**Or using curl:**
```bash
curl -L "https://docs.google.com/spreadsheets/d/1_k8a4r6HNg96bT49IHOPmHDWRJPcKp_WdpNKeJ6pVEA/export?format=xlsx&gid=0" -o src/assets/grocery-data.xlsx
```

After downloading, restart the app with `npm start`.
