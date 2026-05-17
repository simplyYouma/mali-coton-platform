import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function QueryProvider({ children }: Props) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            /**
             * Maquette : on privilégie la fraîcheur. À chaque navigation on
             * re-fetch (refetchOnMount: 'always') et au retour de focus on
             * vérifie aussi — évite les "données fantômes" après une action
             * sup (validation, envoi labo, etc.).
             */
            staleTime: 0,
            refetchOnMount: 'always',
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
