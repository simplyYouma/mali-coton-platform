import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

/**
 * Identifiant d'application (Web App Manifest, champ `id`).
 *
 * Sans lui, un navigateur identifie une PWA par son `start_url`. Deux projets
 * servis sur la meme origine — typiquement deux `localhost` en developpement —
 * se retrouvent alors confondus : proposition d'ouverture dans la mauvaise
 * application, installation qui en ecrase une autre. Cet identifiant fixe
 * l'identite de PASET Mali quelle que soit l'origine.
 */
const APP_ID = '/paset-mali';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /* L'enregistrement est fait a la main dans src/main.tsx : il doit etre
       * conditionne a l'absence de MSW, qui pose son propre service worker. */
      injectRegister: null,
      registerType: 'prompt',

      /* mockServiceWorker.js appartient a MSW : le precacher reviendrait a
       * figer l'outillage de demonstration dans l'application installee. */
      includeAssets: ['icons/*.png'],

      manifest: {
        id: APP_ID,
        name: 'PASET Mali — Suivi socio-environnemental',
        short_name: 'PASET Mali',
        description:
          "Collecte terrain et suivi socio-environnemental des sites de teintureries artisanales au Mali.",
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0468b1',
        theme_color: '#0468b1',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        /* Coque applicative mise en cache : l'application se lance hors ligne. */
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,jpg,jpeg,svg,ico}'],
        globIgnores: ['**/mockServiceWorker.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        /* L'application depasse la limite par defaut de 2 Mio par fichier. */
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,

        runtimeCaching: [
          {
            /* Lectures d'API : le reseau d'abord, le cache en secours. Un agent
             * hors couverture retrouve ainsi les donnees de sa derniere
             * synchronisation au lieu d'un ecran vide. */
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && /\/api(\/|$)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'paset-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            /* Photos de collecte : volumineuses et immuables une fois publiees. */
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'paset-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      /* En developpement, le service worker reste eteint : il masquerait le
       * rechargement a chaud et entrerait en concurrence avec celui de MSW. */
      devOptions: { enabled: false },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  /* Aucun port n'est fige ici.
   *
   * Sur un poste qui heberge plusieurs projets, tout numero choisi d'avance
   * finit par entrer en collision. start.sh cherche donc un port libre au
   * lancement et le transmet par PASET_PORT ; a defaut, Vite retombe sur son
   * comportement habituel (5173, puis le suivant si occupe).
   *
   * Pour epingler un port : PASET_PORT=1234 npm run dev
   */
  server: {
    port: Number(process.env.PASET_PORT) || undefined,
    host: true,

    /* Proxy vers le backend en developpement.
     *
     * La liste CORS du backend ne connait qu'une poignee d'origines locales.
     * Y passer en direct obligerait a lui faire declarer chaque port de chaque
     * poste — intenable des lors que le port est choisi au lancement. Les
     * appels transitent donc par Vite : meme origine, donc pas de CORS.
     *
     * Prefixe distinct de /api pour ne pas recouvrir /api/v1, servi par MSW. */
    proxy: {
      '/backend': {
        target: process.env.VITE_API_BASE_URL || 'https://api.back-paset.com',
        changeOrigin: true,
        rewrite: (chemin) => chemin.replace(/^\/backend/, ''),
      },
    },
  },

  preview: {
    port: Number(process.env.PASET_PORT) || undefined,
  },
});
