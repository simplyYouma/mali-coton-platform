import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { App } from './app/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

async function bootstrap(): Promise<void> {
  // MSW actif en DEV et en prod (maquette autonome — pas de backend réel).
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });

  createRoot(rootElement!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
