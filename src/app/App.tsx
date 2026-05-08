import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { I18nProvider } from './providers/I18nProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { OfflineListener } from './providers/OfflineProvider';
import { ToastViewport } from './providers/ToastProvider';
import { AppRoutes } from './routes';

export function App() {
  return (
    <QueryProvider>
      <I18nProvider>
        <ThemeProvider>
          <BrowserRouter>
            <OfflineListener />
            <AppRoutes />
            <ToastViewport />
          </BrowserRouter>
        </ThemeProvider>
      </I18nProvider>
    </QueryProvider>
  );
}
