declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; version: string; xfbml?: boolean; cookie?: boolean }) => void;
      ui: (
        params: { method: 'share'; href: string; hashtag?: string; quote?: string },
        callback: (response: { post_id?: string; error_code?: number; error_message?: string } | undefined) => void,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;
const SDK_VERSION = 'v23.0';

let initPromise: Promise<void> | null = null;

export function initFacebookSdk(): Promise<void> {
  if (!APP_ID) {
    return Promise.reject(new Error('VITE_FACEBOOK_APP_ID is not set'));
  }
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve, reject) => {
    if (window.FB) {
      window.FB.init({ appId: APP_ID, version: SDK_VERSION, xfbml: false, cookie: false });
      resolve();
      return;
    }

    window.fbAsyncInit = () => {
      try {
        window.FB!.init({ appId: APP_ID, version: SDK_VERSION, xfbml: false, cookie: false });
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://connect.facebook.net/en_US/sdk.js`;
    script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
    document.head.appendChild(script);
  });

  return initPromise;
}

export function isFacebookSdkAvailable(): boolean {
  return !!APP_ID && !!window.FB;
}

export async function shareViaFacebookDialog(href: string): Promise<void> {
  await initFacebookSdk();
  if (!window.FB) throw new Error('Facebook SDK unavailable');
  return new Promise((resolve, reject) => {
    window.FB!.ui({ method: 'share', href }, (response) => {
      if (!response || response.error_code) {
        reject(new Error(response?.error_message || 'Facebook share cancelled'));
        return;
      }
      resolve();
    });
  });
}
