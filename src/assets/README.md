# Assets Folder

## Customer Application Tokens

The `apptoken` field in `customers.json` contains a salted PBKDF2-SHA256 hash,
not an encrypted or plaintext token. Each record uses 600,000 iterations, a
random 16-byte salt, and a 32-byte digest. Users still enter their original
token; login derives the hash with that customer's salt and compares it.
Token matching remains case-sensitive.

After adding or changing a token locally, run this from the project root
**before committing, building, or deploying**:

```powershell
node .\scripts\hash-customer-tokens.cjs
```

The script replaces plaintext tokens in place, preserves existing hashes,
and does not print tokens. Do not commit or deploy plaintext credentials.
Back up original tokens only in a secure password manager; hashing is not
reversible. Deploy the updated login code and hashed JSON together. Web Crypto
requires HTTPS or localhost.

This static JSON is publicly downloadable. Hashing hides the original tokens
but does not prevent offline guessing or bypassing the browser's login state.
Use server-side authentication and authorization to protect private data or
paid access. Tokens previously published in source history or deployed assets
should be rotated; this migration does not erase older copies.

## Excel File Setup

Place your Excel file here with the name: `grocery-data.xlsx`

### How to get the file:

1. **Download from Google Sheets:**
   - Go to: https://docs.google.com/spreadsheets/d/1_k8a4r6HNg96bT49IHOPmHDWRJPcKp_WdpNKeJ6pVEA/edit
   - Click File → Download → Microsoft Excel (.xlsx)
   - Rename the file to `grocery-data.xlsx`
   - Place it in this `src/assets/` folder

2. **Or use your own Excel file:**
   - Name it `grocery-data.xlsx`
   - Place it in this folder
   - The app will automatically read it on startup

The app will try to load from the local file first. If the file is not found, it will attempt to load from Google Sheets as a fallback.
