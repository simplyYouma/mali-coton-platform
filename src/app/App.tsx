import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { I18nProvider } from './providers/I18nProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { OfflineListener } from './providers/OfflineProvider';
import { ToastViewport } from './providers/ToastProvider';
import { ConfirmProvider } from './providers/ConfirmProvider';
import { SessionExpiredModal } from './providers/SessionExpiredModal';
import { PwaUpdatePrompt } from '@/pwa/PwaUpdatePrompt';
import { PwaInstallPrompt } from '@/pwa/PwaInstallPrompt';
import { AppRoutes } from './routes';

export function App() {
  return (
    <QueryProvider>
      <I18nProvider>
        <ThemeProvider>
          <BrowserRouter>
            <ConfirmProvider>
              <OfflineListener />
              <AppRoutes />
              <ToastViewport />
              <SessionExpiredModal />
              <PwaUpdatePrompt />
              <PwaInstallPrompt />
            </ConfirmProvider>
          </BrowserRouter>
        </ThemeProvider>
      </I18nProvider>
    </QueryProvider>
  );
}
