const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function isGoogleAuthAvailable(): boolean {
  return !!GOOGLE_CLIENT_ID;
}

export function openGooglePopup(): Promise<string> {
  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin;
    const scope = 'email profile openid';
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(scope)}` +
      `&prompt=select_account`;

    const w = 480;
    const h = 600;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(url, 'google-signin', `width=${w},height=${h},left=${left},top=${top}`);

    if (!popup) {
      reject(new Error('Popup blocked'));
      return;
    }

    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          reject(new Error('Popup closed'));
          return;
        }
        if (popup.location.origin === window.location.origin) {
          const hash = popup.location.hash;
          popup.close();
          clearInterval(timer);
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          if (accessToken) {
            resolve(accessToken);
          } else {
            reject(new Error('No access token'));
          }
        }
      } catch {
      }
    }, 200);
  });
}

export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Google profile');
  const data = await res.json();
  if (!data.email) throw new Error('No email in Google profile');
  return data.email;
}
