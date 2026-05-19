import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { App } from './app/App';
import { USE_MSW, API_MODE, API_BASE } from './lib/apiConfig';

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
}

void bootstrap();
