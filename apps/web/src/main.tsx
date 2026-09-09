import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/maitree/500.css';
import '@fontsource/maitree/600.css';
import '@fontsource/ibm-plex-sans-thai/400.css';
import '@fontsource/ibm-plex-sans-thai/500.css';
import '@fontsource/ibm-plex-sans-thai/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import App from './App';
import { loadRuntimeConfig } from './api';
import './styles.css';

/* config.json is read before the first render so the very first search already
   uses the owner's URLs, rather than failing once and recovering. */
loadRuntimeConfig().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
