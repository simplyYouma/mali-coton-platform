import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { App } from './app/App';
import { USE_MSW, API_MODE, API_BASE } from './lib/apiConfig';
import { enregistrerPwa } from './pwa/pwaRegistration';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

async function bootstrap(): Promise<void> {
  // eslint-disable-next-line no-console
  console.info(
    `[bootstrap] API mode = ${API_MODE} · base = ${API_BASE} · MSW ${USE_MSW ? 'ON' : 'OFF'}`,
  );

  if (USE_MSW) {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
  }

  createRoot(rootElement!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  /* Apres le rendu : l'installation du service worker ne doit pas retarder
   * l'affichage. Sans effet en mode mock, ou MSW occupe deja la place. */
  enregistrerPwa();
}

void bootstrap();
