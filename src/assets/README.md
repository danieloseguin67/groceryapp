# Assets Folder

## Language Selection

Choose **Language / Langue** on the login screen or in the desktop/mobile menu.
The selection is saved in this browser and applies to the entire interface:
login, buttons, table headings, search, reports, statistics, messages, help,
about, and support. Prices and report dates use Canadian English or French
formatting. Switching languages keeps active search and pickup filters.

Category labels come from the `en` and `fr` fields in `category.json`; recognized
categories are converted on load, import, and language changes. Do not rename
JSON property keys: they remain compatible with existing backups in either
language. Product names, brands, store names, and customer-entered notes are
preserved rather than automatically translated. Google file pickers use the
selected language; Google sign-in screens and native browser dialogs may follow
the Google account or browser's own language settings.

Choisissez **Langue** sur l’écran de connexion ou dans le menu. Votre choix est
conservé dans ce navigateur et s’applique à toute l’interface. Les catégories
utilisent les champs `en` et `fr` de `category.json`. Les noms de produits, les
marques, les magasins et vos notes restent inchangés; les clés JSON ne changent
pas, afin de préserver la compatibilité des sauvegardes.

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
