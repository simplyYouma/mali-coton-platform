import { useEffect, useState, type ReactNode } from 'react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resourcesFr } from '@/i18n/fr';
import { resourcesBm } from '@/i18n/bm';

interface Props {
  children: ReactNode;
}

export function I18nProvider({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void i18next
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources: {
          fr: resourcesFr,
          bm: resourcesBm,
        },
        fallbackLng: 'fr',
        supportedLngs: ['fr', 'bm'],
        defaultNS: 'common',
        interpolation: { escapeValue: false },
        detection: {
          order: ['localStorage', 'navigator'],
          caches: ['localStorage'],
          lookupLocalStorage: 'mc.locale',
        },
      })
      .then(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}
