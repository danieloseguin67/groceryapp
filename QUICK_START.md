# 🚀 Quick Start - Google Drive Setup (5 Minutes)

## Step 1: Create Google Cloud Project (2 min)

1. Go to: https://console.cloud.google.com/
2. Click **"Create Project"**
3. Name: `GroceryManager`
4. Click **"Create"**

## Step 2: Enable APIs (1 min)

1. In your project, click **"APIs & Services"** → **"Library"**
2. Search and enable:
   - ✅ **Google Drive API** → Click "Enable"
   - ✅ **Google Picker API** → Click "Enable"

## Step 3: Configure OAuth Consent Screen (2 min)

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** → Click "Create"
3. Fill in:
   - App name: `Grocery Manager`
   - User support email: (your email)
   - Developer contact: (your email)
4. Click **"Save and Continue"** (3 times, skip scopes and test users for now)
5. Click **"Back to Dashboard"**

## Step 4: Create Credentials (2 min)

### Create OAuth Client ID

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Grocery Manager Web`
5. Authorized JavaScript origins:
   ```
   http://localhost:4200
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:4200
   ```
7. Click **"Create"**
8. **COPY YOUR CLIENT ID** (looks like: `xxxxx.apps.googleusercontent.com`)

### Create API Key

1. Click **"Create Credentials"** → **"API Key"**
2. **COPY YOUR API KEY**
3. Click **"Restrict Key"**:
   - API restrictions → Select: `Google Drive API`, `Google Picker API`
   - Click **"Save"**

## Step 5: Update Your Code (30 seconds)

1. Open: `src/environments/environment.ts`
2. Replace these lines:

```typescript
clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',  // Paste your Client ID here
apiKey: 'YOUR_API_KEY',  // Paste your API Key here
```

Example (with your actual values):
```typescript
clientId: '123456789-abcdef.apps.googleusercontent.com',
apiKey: 'AIzaSyABCDEF123456789',
```

3. **Save the file**

## Step 6: Run Your App

```bash
npm start
```

Navigate to: `http://localhost:4200`

## ✅ Test It!

1. Login to your grocery app
2. Click **"🔐 Sign in with Google"**
3. Grant permissions in the popup
4. You should see **"🔓 Sign Out"** button
5. Try **"☁️ Save to Drive"** button
6. Check your Google Drive → You'll see a **"GroceryManager"** folder!

## 🎉 Done!

That's it! Your app now has Google Drive integration.

## 🐛 Troubleshooting

**Problem: "Google API not loaded"**
- Refresh the page
- Check browser console for errors
- Verify index.html has Google scripts

**Problem: "Authorization failed"**
- Double-check your Client ID in environment.ts
- Make sure `http://localhost:4200` is in authorized origins
- Try incognito/private browsing mode

**Problem: Popup blocked**
- Allow popups for localhost:4200
- Check browser's popup blocker settings

**Problem: "Invalid API key"**
- Verify API Key in environment.ts
- Check that APIs are enabled in Google Cloud
- Make sure API Key restrictions allow your domain

## 📚 Need More Help?

See detailed guide: [GOOGLE_DRIVE_SETUP.md](GOOGLE_DRIVE_SETUP.md)

## 🔒 Security Note

**NEVER commit your credentials to git!**

Add this to `.gitignore` if not already there:
```
src/environments/environment.ts
```

Use environment variables in production.

---

**Time to setup**: ~5 minutes
**Difficulty**: Easy ⭐
**Cost**: Free (Google Cloud free tier)
