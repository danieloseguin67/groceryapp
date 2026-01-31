export const environment = {
  production: true,
  google: {
    // TODO: Replace with your production Google Cloud Project credentials
    clientId: 'YOUR_PRODUCTION_CLIENT_ID.apps.googleusercontent.com',
    apiKey: 'YOUR_PRODUCTION_API_KEY',
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ].join(' '),
    discoveryDocs: [
      'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
    ]
  }
};
