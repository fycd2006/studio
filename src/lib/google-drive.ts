export const GOOGLE_CLIENT_ID = '113220774756-hjbgi9usbqom9p4kko0229sq0pgn4peo.apps.googleusercontent.com';
export const GOOGLE_API_KEY = 'AIzaSyCr86vmBvYAuaIS9LxGc7nSwKJZdc_B_Ow';
export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file';

let accessToken = '';
let tokenExpiration = 0;

declare global {
  interface Window {
    google: any;
  }
}

export async function getGoogleAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiration) {
    return accessToken;
  }

  return new Promise((resolve, reject) => {
    const requestToken = () => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GOOGLE_SCOPES,
          callback: (response: any) => {
            if (response.error !== undefined) {
              reject(response);
            }
            accessToken = response.access_token;
            // Token expires in 3600 seconds typically, subtract 1 minute for safety
            tokenExpiration = Date.now() + (response.expires_in * 1000) - 60000;
            resolve(accessToken);
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    };

    if (typeof window.google === 'undefined' || !window.google.accounts) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = requestToken;
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      document.head.appendChild(script);
    } else {
      requestToken();
    }
  });
}

export async function uploadJsonToDrive(fileName: string, data: object) {
  const token = await getGoogleAccessToken();
  
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  // Two step upload for Google Drive API: 
  // 1. Create file metadata only (gets the file ID)
  const createRes = await fetch(`https://www.googleapis.com/drive/v3/files?key=${GOOGLE_API_KEY}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata)
  });

  if (!createRes.ok) {
    throw new Error('Failed to create file metadata in Google Drive');
  }

  const fileData = await createRes.json();
  const fileId = fileData.id;

  // 2. Upload file content to that file ID using uploadType=media
  const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&key=${GOOGLE_API_KEY}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data, null, 2)
  });

  if (!uploadRes.ok) {
    throw new Error('Failed to upload file content to Google Drive');
  }

  return await uploadRes.json();
}
