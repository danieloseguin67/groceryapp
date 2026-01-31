# Google Drive Integration Setup Guide

## 🎯 Overview
Your Grocery Manager app now includes Google Drive integration, allowing users to:
- Save grocery data and summaries to Google Drive
- Load data from Google Drive on any device
- Keep local download/upload as fallback options
- Access a comprehensive help guide

## 📋 Prerequisites
1. A Google Cloud Project
2. Google Drive API enabled
3. OAuth 2.0 credentials configured

## 🔧 Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Name your project (e.g., "GroceryManager")
4. Click "Create"

### Step 2: Enable Required APIs

1. In your project, go to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - **Google Drive API**
   - **Google Picker API**
3. Click "Enable" for each

### Step 3: Create OAuth 2.0 Credentials

#### Create OAuth 2.0 Client ID

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: **External** (unless you have Google Workspace)
   - App name: **Grocery Manager**
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add the following:
     - `.../auth/drive.file` (Per-file access to files created or opened by the app)
     - `.../auth/drive.readonly` (Read-only access to Drive)
   - Test users: Add your email and any other testers
   - Click "Save and Continue"

4. Back in Credentials, create OAuth client ID:
   - Application type: **Web application**
   - Name: **Grocery Manager Web Client**
   - Authorized JavaScript origins:
     - `http://localhost:4200` (for development)
     - Your production URL when deployed (e.g., `https://yourdomain.com`)
   - Authorized redirect URIs:
     - `http://localhost:4200` (for development)
     - Your production URL when deployed
   - Click "Create"

5. **Save your Client ID** - you'll need this!

#### Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. **Save your API Key**
4. Click "Edit API Key" to restrict it:
   - Application restrictions: **HTTP referrers (web sites)**
   - Website restrictions: Add:
     - `http://localhost:4200/*` (for development)
     - Your production domain when deployed
   - API restrictions: **Restrict key**
     - Select: Google Drive API, Google Picker API
   - Click "Save"

### Step 4: Configure Your Application

1. Open `src/environments/environment.ts`
2. Replace the placeholder values:

```typescript
export const environment = {
  production: false,
  google: {
    clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com', // From Step 3
    apiKey: 'YOUR_API_KEY', // From Step 3
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ].join(' '),
    discoveryDocs: [
      'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
    ]
  }
};
```

3. Do the same for `src/environments/environment.prod.ts` with your production credentials

### Step 5: Run the Application

```bash
npm install
npm start
```

Navigate to `http://localhost:4200`

## 🎨 New Features

### For Users

1. **Sign in with Google**
   - Click the "🔐 Sign in with Google" button
   - Grant permissions when prompted
   - Stay signed in across sessions

2. **Save to Drive**
   - Use "☁️ Save to Drive" buttons to save data
   - Files are automatically saved to "GroceryManager" folder
   - Includes timestamp versioning

3. **Load from Drive**
   - Click "📤 Load Data from Drive" or "📤 Load Summaries from Drive"
   - Select files from your Drive using the picker
   - Data syncs automatically

4. **Help Guide**
   - Click the "❓ Help" button
   - Comprehensive step-by-step instructions
   - Covers all app features

5. **Local Backup Options**
   - Download locally still available as fallback
   - Works without Google account
   - Manual file upload/download

### For Developers

#### New Service: `GoogleDriveService`

Location: `src/app/services/google-drive.service.ts`

Key Methods:
- `authenticate()` - OAuth sign-in flow
- `signOut()` - Sign out and clear tokens
- `isSignedIn()` - Check authentication status
- `openFolderPicker()` - Show folder picker dialog
- `openFilePicker()` - Show file picker dialog
- `uploadJsonFile()` - Upload JSON to Drive
- `downloadJsonFile()` - Download JSON from Drive
- `getOrCreateGroceryManagerFolder()` - Auto-create app folder

#### Component Updates

**app.component.ts**:
- New properties: `isGoogleSignedIn`, `isLoadingDrive`, `driveOperationMessage`, `showHelpModal`
- Google Drive methods: `signInToGoogle()`, `signOutFromGoogle()`, `saveGroceryDataToDrive()`, `saveSummariesToDrive()`, `loadGroceryDataFromDrive()`, `loadSummariesFromDrive()`
- Help modal methods: `openHelpModal()`, `closeHelpModal()`

**app.component.html**:
- Google sign-in/out buttons
- Drive operation loading overlay
- Status messages for Drive operations
- Button groups for local vs Drive options
- Load from Drive buttons
- Comprehensive help modal

**app.component.css**:
- Google-themed button styles (`.btn-google`, `.btn-drive`, etc.)
- Loading overlay and spinner
- Status message styling
- Help modal specific styles
- Button group layout

## 🔒 Security Notes

1. **Never commit credentials to git**
   - Add `src/environments/environment.ts` to `.gitignore` if not already
   - Use environment variables for production

2. **API Key Restrictions**
   - Always restrict API keys to specific domains
   - Limit to only necessary APIs

3. **OAuth Scopes**
   - App only requests file-level access (`drive.file`)
   - Can't access files created by other apps
   - Read-only scope for viewing existing files

4. **Token Storage**
   - Access tokens stored in localStorage
   - Tokens expire after 1 hour
   - Automatic refresh on next use

## 🚀 Deployment Considerations

### For Production:

1. **Update environment.prod.ts**
   - Use production Client ID and API Key
   - Update authorized domains

2. **Update Google Cloud Console**
   - Add production URLs to authorized origins
   - Add production URLs to authorized redirects
   - Publish OAuth consent screen (after testing)

3. **Domain Verification**
   - Verify your domain in Google Search Console
   - Link to Google Cloud Project

4. **HTTPS Required**
   - Google OAuth requires HTTPS in production
   - Use SSL certificate for your domain

## 🐛 Troubleshooting

### Issue: "Google API not loaded"
- Check that index.html includes Google API scripts
- Verify scripts load before Angular initializes
- Check browser console for script errors

### Issue: "Authentication failed"
- Verify Client ID is correct in environment.ts
- Check authorized origins in Google Cloud Console
- Clear browser cache and try again
- Check popup blocker settings

### Issue: "Picker not showing"
- Ensure API Key is correct
- Verify Picker API is enabled
- Check API Key restrictions allow your domain

### Issue: "Upload/Download fails"
- Check user granted all required permissions
- Verify Drive API is enabled
- Check browser console for detailed error messages
- Ensure token hasn't expired (refresh page)

## 📚 Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [Google Picker API Documentation](https://developers.google.com/picker)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)

## ✅ Testing Checklist

- [ ] Google sign-in works
- [ ] Sign-out clears tokens
- [ ] Save grocery data to Drive
- [ ] Save summaries to Drive
- [ ] Load grocery data from Drive
- [ ] Load summaries from Drive
- [ ] GroceryManager folder auto-creates
- [ ] Local download still works
- [ ] Help modal displays correctly
- [ ] Mobile menu includes all new buttons
- [ ] Loading indicators show during operations
- [ ] Error messages display appropriately
- [ ] Works across different browsers
- [ ] Works on mobile devices

## 🎉 You're All Set!

Your Grocery Manager now has full Google Drive integration with comprehensive help documentation. Users can seamlessly sync their data across devices while maintaining local backup options as fallback.
