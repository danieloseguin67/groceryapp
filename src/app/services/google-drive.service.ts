import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare const gapi: any;
declare const google: any;

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveService {
  private gapiInitialized = false;
  private accessToken: string | null = null;
  private tokenClient: any = null;

  constructor() {
    // Load Google API asynchronously, don't block construction
    this.loadGapi().catch(error => {
      console.warn('Google Drive service initialization failed:', error);
      // Service will still work for isSignedIn checks, but auth will fail
    });
  }

  /**
   * Load and initialize Google API
   */
  private async loadGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if credentials are configured
      if (environment.google.clientId === 'YOUR_CLIENT_ID.apps.googleusercontent.com' || 
          environment.google.apiKey === 'YOUR_API_KEY') {
        console.warn('⚠️ Google Drive credentials not configured. Please update src/environments/environment.ts');
        reject('Google Drive credentials not configured');
        return;
      }

      if (typeof gapi === 'undefined') {
        console.error('❌ Google API scripts not loaded. Please check index.html');
        reject('Google API not loaded');
        return;
      }

      gapi.load('client:picker', async () => {
        try {
          await gapi.client.init({
            apiKey: environment.google.apiKey,
            discoveryDocs: environment.google.discoveryDocs,
          });
          this.gapiInitialized = true;
          console.log('✅ Google API initialized successfully');
          resolve();
        } catch (error) {
          console.error('❌ Error initializing Google API:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Authenticate user with Google OAuth
   */
  async authenticate(): Promise<boolean> {
    try {
      // Wait for gapi to be initialized
      if (!this.gapiInitialized) {
        try {
          await this.loadGapi();
        } catch (error) {
          // Provide user-friendly error message
          if (error === 'Google Drive credentials not configured') {
            throw new Error('Google Drive is not configured. Please follow the setup instructions in QUICK_START.md');
          }
          throw error;
        }
      }

      // Check if already authenticated with valid token
      const storedToken = localStorage.getItem('google_access_token');
      const tokenExpiry = localStorage.getItem('google_token_expiry');
      
      if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        this.accessToken = storedToken;
        gapi.client.setToken({ access_token: storedToken });
        console.log('✅ Using stored access token');
        return true;
      }

      // Initialize token client if not already done
      if (!this.tokenClient && typeof google !== 'undefined' && google.accounts) {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: environment.google.clientId,
          scope: environment.google.scopes,
          callback: '', // Will be set in the request
        });
      }

      // Request new token
      return new Promise((resolve, reject) => {
        try {
          this.tokenClient.callback = (response: any) => {
            if (response.error) {
              console.error('❌ Authentication error:', response);
              reject(response.error);
              return;
            }

            this.accessToken = response.access_token;
            
            // Store token with 1 hour expiry (tokens typically last 1 hour)
            const expiryTime = Date.now() + (3600 * 1000);
            localStorage.setItem('google_access_token', response.access_token);
            localStorage.setItem('google_token_expiry', expiryTime.toString());
            
            gapi.client.setToken({ access_token: response.access_token });
            console.log('✅ Successfully authenticated with Google');
            resolve(true);
          };

          this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (error) {
          console.error('❌ Error during authentication:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Sign out and clear tokens
   */
  signOut(): void {
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('✅ Access token revoked');
      });
    }
    
    this.accessToken = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('grocery_drive_folder_id');
    gapi.client.setToken(null);
    console.log('✅ Signed out from Google');
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    const storedToken = localStorage.getItem('google_access_token');
    const tokenExpiry = localStorage.getItem('google_token_expiry');
    
    if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      this.accessToken = storedToken;
      return true;
    }
    
    return false;
  }

  /**
   * Open Google Picker to select a folder
   */
  async openFolderPicker(): Promise<string | null> {
    try {
      if (!this.gapiInitialized) {
        await this.loadGapi();
      }

      if (!this.accessToken) {
        await this.authenticate();
      }

      return new Promise((resolve, reject) => {
        const picker = new google.picker.PickerBuilder()
          .addView(new google.picker.DocsView(google.picker.ViewId.FOLDERS)
            .setSelectFolderEnabled(true))
          .setOAuthToken(this.accessToken!)
          .setDeveloperKey(environment.google.apiKey)
          .setCallback((data: any) => {
            if (data.action === google.picker.Action.PICKED) {
              const folderId = data.docs[0].id;
              console.log('✅ Selected folder:', folderId);
              // Store the selected folder for future use
              localStorage.setItem('grocery_drive_folder_id', folderId);
              resolve(folderId);
            } else if (data.action === google.picker.Action.CANCEL) {
              resolve(null);
            }
          })
          .build();
        
        picker.setVisible(true);
      });
    } catch (error) {
      console.error('❌ Error opening folder picker:', error);
      throw error;
    }
  }

  /**
   * Open Google Picker to select files
   */
  async openFilePicker(mimeType: string = 'application/json'): Promise<DriveFile[]> {
    try {
      if (!this.gapiInitialized) {
        await this.loadGapi();
      }

      if (!this.accessToken) {
        await this.authenticate();
      }

      return new Promise((resolve, reject) => {
        const view = new google.picker.DocsView()
          .setIncludeFolders(true)
          .setMimeTypes(mimeType);

        const picker = new google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(this.accessToken!)
          .setDeveloperKey(environment.google.apiKey)
          .setCallback((data: any) => {
            if (data.action === google.picker.Action.PICKED) {
              const files = data.docs.map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                modifiedTime: doc.lastEditedUtc,
                size: doc.sizeBytes
              }));
              console.log('✅ Selected files:', files);
              resolve(files);
            } else if (data.action === google.picker.Action.CANCEL) {
              resolve([]);
            }
          })
          .build();
        
        picker.setVisible(true);
      });
    } catch (error) {
      console.error('❌ Error opening file picker:', error);
      throw error;
    }
  }

  /**
   * Upload JSON file to Google Drive
   */
  async uploadJsonFile(folderId: string, filename: string, jsonData: any): Promise<string> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const metadata = {
        name: filename,
        mimeType: 'application/json',
        parents: [folderId]
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(jsonData, null, 2) +
        close_delim;

      const response = await gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: {
          'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        body: multipartRequestBody
      });

      console.log('✅ File uploaded successfully:', response.result.id);
      return response.result.id;
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Download JSON file from Google Drive
   */
  async downloadJsonFile(fileId: string): Promise<any> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });

      console.log('✅ File downloaded successfully');
      return response.result;
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  async listFilesInFolder(folderId: string, namePattern?: string): Promise<DriveFile[]> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      let query = `'${folderId}' in parents and mimeType='application/json' and trashed=false`;
      if (namePattern) {
        query += ` and name contains '${namePattern}'`;
      }

      const response = await gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, modifiedTime, size)',
        orderBy: 'modifiedTime desc',
        pageSize: 100
      });

      const files: DriveFile[] = response.result.files || [];
      console.log(`✅ Found ${files.length} files in folder`);
      return files;
    } catch (error) {
      console.error('❌ Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get or create GroceryManager folder
   */
  async getOrCreateGroceryManagerFolder(): Promise<string> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      // Check if we already have a stored folder ID
      const storedFolderId = localStorage.getItem('grocery_drive_folder_id');
      if (storedFolderId) {
        // Verify it still exists
        try {
          await gapi.client.drive.files.get({ fileId: storedFolderId });
          return storedFolderId;
        } catch {
          // Folder doesn't exist anymore, continue to create new one
          localStorage.removeItem('grocery_drive_folder_id');
        }
      }

      // Search for existing GroceryManager folder
      const response = await gapi.client.drive.files.list({
        q: "name='GroceryManager' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (response.result.files && response.result.files.length > 0) {
        const folderId = response.result.files[0].id;
        localStorage.setItem('grocery_drive_folder_id', folderId);
        console.log('✅ Found existing GroceryManager folder:', folderId);
        return folderId;
      }

      // Create new folder
      const createResponse = await gapi.client.drive.files.create({
        resource: {
          name: 'GroceryManager',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });

      const folderId = createResponse.result.id;
      localStorage.setItem('grocery_drive_folder_id', folderId);
      console.log('✅ Created GroceryManager folder:', folderId);
      return folderId;
    } catch (error) {
      console.error('❌ Error getting/creating folder:', error);
      throw error;
    }
  }
}
