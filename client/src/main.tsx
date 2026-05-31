import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initFacebookSdk } from './utils/facebookSdk';
import './App.css';
import '@fontsource/encode-sans-expanded/100.css';
import '@fontsource/encode-sans-expanded/200.css';
import '@fontsource/encode-sans-expanded/300.css';
import '@fontsource/encode-sans-expanded/400.css';
import '@fontsource/encode-sans-expanded/500.css';
import '@fontsource/encode-sans-expanded/600.css';
import '@fontsource/encode-sans-expanded/700.css';
import '@fontsource/encode-sans-expanded/800.css';
import '@fontsource/encode-sans-expanded/900.css';
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';
import '@fontsource/rubik-one/400.css';
import '@fontsource/secular-one/400.css';

initFacebookSdk().catch(() => { /* missing/blocked SDK falls back to sharer.php */ });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

