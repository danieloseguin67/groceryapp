export const environment = {
  production: false,
  google: {
    // TODO: Replace with your actual Google Cloud Project credentials
    // 1. Go to https://console.cloud.google.com/
    // 2. Create a new project or select existing one
    // 3. Enable Google Drive API and Google Picker API
    // 4. Create OAuth 2.0 Client ID (Web application)
    // 5. Add authorized JavaScript origins: http://localhost:4200
    // 6. Add authorized redirect URIs: http://localhost:4200
    // 7. Create API Key and restrict it to Drive API and Picker API
    clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    apiKey: 'YOUR_API_KEY',
    // Scopes required for Drive operations
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ].join(' '),
    discoveryDocs: [
      'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
    ]
  }
};
