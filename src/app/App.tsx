import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { I18nProvider } from './providers/I18nProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { OfflineListener } from './providers/OfflineProvider';
import { ToastViewport } from './providers/ToastProvider';
import { ConfirmProvider } from './providers/ConfirmProvider';
import { AuthzProvider } from './providers/AuthzProvider';
import { SessionExpiredModal } from './providers/SessionExpiredModal';
import { PwaUpdatePrompt } from '@/pwa/PwaUpdatePrompt';
import { RouteProgress } from '@/components/common';
import { AppRoutes } from './routes';

export function App() {
  return (
    <QueryProvider>
      <I18nProvider>
        <ThemeProvider>
          <BrowserRouter>
            <ConfirmProvider>
              {/* Les droits du compte conditionnent le menu et les routes :
                * le fournisseur enveloppe donc toute la navigation. */}
              <AuthzProvider>
                <RouteProgress />
                <OfflineListener />
                <AppRoutes />
                <ToastViewport />
                <SessionExpiredModal />
                <PwaUpdatePrompt />
              </AuthzProvider>
            </ConfirmProvider>
          </BrowserRouter>
        </ThemeProvider>
      </I18nProvider>
    </QueryProvider>
  );
}
