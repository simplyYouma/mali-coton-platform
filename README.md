# Mali Coton — Plateforme PNUD

Plateforme numérique de suivi socio-environnemental des sites de teintureries artisanales au Mali.

**Projet** : Renforcement de la Durabilité du Secteur Textile au Mali — *UNDP-MLI-00492*
**Maître d'ouvrage** : PNUD Mali
**Cabinet retenu** : Consortium Sahel Analytics (Lead) & Sahel Environnement
**Livrable courant** : L2 — Maquette interactive validée

---

## Démarrage

**En un clic** — double-cliquez sur `start.bat` (Windows) ou `start.sh` (macOS/Linux).

Le lanceur vérifie Node.js, installe les dépendances si besoin, démarre le serveur
et ouvre le navigateur. En cas de problème, il affiche la cause et la marche à suivre.

```bash
./start.sh              # mode API du .env.local, sinon backend réel
./start.sh mock         # données de démonstration, aucun backend requis
./start.sh live         # backend réel
./start.sh --no-browser # sans ouverture automatique du navigateur
```

> Sous Windows, passez par `start.bat` : Git Bash n'est pas associé aux fichiers
> `.sh`, donc un double-clic sur `start.sh` n'ouvre généralement qu'un éditeur.
> `start.bat` ne fait que retrouver Git Bash et lui confier `start.sh`.

**Manuellement**, si vous préférez :

```bash
npm install
npm run dev
```

L'application est accessible sur http://localhost:5180 (Vite bascule
automatiquement sur le port suivant s'il est déjà pris).

> Le port 5180 est choisi volontairement, à la place du 5173 par défaut de
> Vite. Une application installable est identifiée par son origine, **port
> compris** : partager le 5173 avec un autre projet installé conduit le
> navigateur à proposer d'ouvrir PASET dans l'application voisine.

### Mode API

Sans fichier `.env.local`, l'application interroge le **backend réel** —
il faut donc une connexion pour s'authentifier. Pour travailler hors ligne avec
les données de démonstration, lancez `./start.sh mock`, ou créez un `.env.local` :

```
VITE_API_MODE=mock
```

## Comptes de démonstration

Disponibles en mode `mock` uniquement (`./start.sh mock`).

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur PNUD | `admin@pnud.org` | `demo` |
| Superviseur | `superviseur@sahel.com` | `demo` |
| Agent terrain (Bamako) | `agent.bamako@sahel.com` | `demo` |
| Agent terrain (Ségou) | `agent.segou@sahel.com` | `demo` |
| Observateur (lecture seule) | `observateur@pnud.org` | `demo` |

Un agent terrain n'a accès qu'aux formulaires de collecte : il est redirigé vers
`/formulaires` à la connexion, et le tableau de bord lui reste fermé.

## Scripts

| Commande | Description |
|---|---|
| `./start.sh` | Lanceur de développement (vérifications + serveur + navigateur) |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build production typé |
| `npm run preview` | Prévisualiser le build |
| `npm run lint` | Linter ESLint (TS strict + a11y) |
| `npm run format` | Formatage Prettier |
| `npm run test` | Tests unitaires Vitest |
| `npm run test:e2e` | Tests E2E Playwright |
| `npm run storybook` | Storybook bibliothèque de composants |

## Documentation

- [Cahier des charges (PDF)](CDC_Mali_Coton_v2.pdf)
- [Livrable L2 — synthèse](docs/L2-livrable.md)
- [Rapport tests utilisateurs L2](docs/L2-rapport-tests-utilisateurs.md)
- [Design System](docs/design-system.md)
- [Spécification technique frontend](docs/tech-spec.md)
- [Plan d'implémentation L2](docs/superpowers/plans/2026-04-25-maquette-l2.md)

## Démonstration interactive

Toutes les actions (créer un utilisateur, valider une collecte, modifier un seuil, générer un rapport, soumettre une collecte offline) sont **réellement exécutées** en mémoire via MSW + IndexedDB. React Query rafraîchit l'UI immédiatement.

> **À retenir pour la démo** : un *full reload* (F5) restaure l'état initial des fixtures MSW. Les brouillons de collecte restent persistés en IndexedDB.

## Architecture (résumé)

Architecture **feature-based** + couches strictes (Domain / Application / Infrastructure / Interface) — voir `docs/tech-spec.md` §3.

```
src/
├── app/            # Bootstrap, routing, providers
├── features/       # Modules métier (sites, collection, dashboard, admin, ...)
├── components/     # Bibliothèque commune (design system)
├── lib/            # Utilitaires purs
├── styles/         # Tokens, reset, globals
├── i18n/           # FR + BM (Bambara)
├── mocks/          # MSW handlers + fixtures
└── types/          # Types globaux
```

## Bilingue

Interface disponible en **français** (par défaut). Le **bambara** est amorcé sur les écrans agent (collecte) ; la traduction complète est planifiée en Phase L3 avec validation linguistique terrain.

## Application installable (PWA)

L'agent ouvre PASET dans le navigateur de sa tablette et l'installe sur son
écran d'accueil : elle s'ouvre ensuite en plein écran, sans barre d'adresse,
comme une application native.

| Élément | Détail |
|---|---|
| Identifiant (`id`) | `/paset-mali` — distingue PASET de toute autre application servie sur la même origine |
| Icônes | `public/icons/`, régénérables via `node tools/generate-icons.mjs` |
| Service worker | Généré au build (Workbox). Coque applicative précachée, lectures d'API en *network-first*, images en *cache-first* |
| Mise à jour | Proposée par une bannière, jamais imposée : une saisie en cours n'est pas interrompue |

**En développement, le service worker reste éteint.** MSW pose le sien pour
intercepter les requêtes de démonstration, et une page ne peut être contrôlée
que par un seul service worker à la fois. La PWA ne s'active donc qu'en mode
`live`, sur un build de production (`npm run build && npm run preview`).

### Ce qui fonctionne hors ligne, et ce qui reste à faire

Fonctionne : l'application **se lance** sans réseau, et les données déjà
consultées restent affichées (dernière synchronisation en cache).

À construire : la **soumission** d'un formulaire hors ligne. La file d'attente
(`syncQueue` + IndexedDB via Dexie) n'est aujourd'hui câblée que sur l'ancienne
feature `collection` ; la feature `formulaires` — celle de la collecte native —
poste directement à l'API et échoue donc sans réseau. C'est le chantier suivant
décrit dans [docs/approche-collecte-native.md](docs/approche-collecte-native.md).
