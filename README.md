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
./start.sh pwa          # build + aperçu : seul mode où l'app est installable
./start.sh --no-browser # sans ouverture automatique du navigateur
```

> `pwa` construit d'abord le projet, puis sert le résultat. C'est nécessaire
> parce que le service worker est éteint en développement (voir
> [Application installable](#application-installable-pwa)) : sans build, aucune
> icône d'installation n'apparaît.

> Sous Windows, passez par `start.bat` : Git Bash n'est pas associé aux fichiers
> `.sh`, donc un double-clic sur `start.sh` n'ouvre généralement qu'un éditeur.
> `start.bat` ne fait que retrouver Git Bash et lui confier `start.sh`.

**Manuellement**, si vous préférez :

```bash
npm install
npm run dev
```

Le lanceur cherche un port libre à partir de **8492** et affiche l'adresse
retenue. Aucun port n'est figé : sur un poste qui héberge plusieurs projets,
tout numéro choisi d'avance finit par entrer en collision.

```bash
PASET_PORT=1234 ./start.sh   # pour épingler un port précis
```

> Le point de départ 8492 est volontairement hors de la plage 5173-5190, où se
> bousculent les serveurs Vite des autres projets — et où d'anciennes PWA de
> développement, installées depuis ces mêmes ports, réclament l'origine. Voir
> [« Ouvrir dans l'appli »](#le-navigateur-propose-douvrir-dans-une-autre-application).

### Les données de démonstration ne partent jamais en production

Le mode `mock` sert au développement et aux démonstrations. Deux garde-fous
l'empêchent d'atteindre les utilisateurs réels :

1. **Le build refuse de se produire** si `VITE_API_MODE` vaut `mock`
   (`vite.config.ts`). Il n'y a donc pas d'artefact à déployer par erreur.
2. **L'application refuse de démarrer** si un build de production se retrouve
   malgré tout en mode mock (`apiConfig.ts`) — mieux vaut un écran d'erreur
   qu'une donnée fictive présentée comme réelle.

Le service worker de MSW (`public/mockServiceWorker.js`) est par ailleurs retiré
du build : `public/` étant recopié intégralement par Vite, il partait sinon en
production.

> **Limite connue.** Sept pages importent encore `mockUsers` depuis les fixtures
> pour afficher un nom d'agent à partir de son identifiant. Ces fixtures restent
> donc dans le bundle de production, et en mode `live` les noms ne se résolvent
> pas (l'identifiant brut s'affiche à la place). À traiter en branchant ces
> pages sur l'API des utilisateurs.

### Proxy de développement

En mode `live`, les appels au backend ne partent pas directement vers
`api.back-paset.com` : ils passent par le serveur Vite, sous le préfixe
`/backend`, qui les relaie. Ce sont donc des requêtes de **même origine**,
hors du champ de CORS.

Sans ce détour, la liste blanche du backend devrait déclarer le port local de
chaque poste — impossible dès lors que le port est cherché au lancement. Elle
ne connaît aujourd'hui que `http://localhost:5173` : toute autre origine
recevait un `Failed to fetch` au moment de se connecter.

Le préfixe est volontairement distinct de `/api`, pour ne pas recouvrir
`/api/v1` servi par MSW en mode mock.

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
| Port de développement | Cherché libre au lancement (base 8492), jamais figé |
| Icônes | `public/img/`, régénérables via `node tools/generate-icons.mjs` (servies hors de `public/icons/` : ce chemin est bloqué par une couche de sécurité de l'hébergeur en production) |
| Service worker | Généré au build (Workbox). Coque applicative précachée, lectures d'API en *network-first*, images en *cache-first* |
| Mise à jour | Proposée par une bannière, jamais imposée : une saisie en cours n'est pas interrompue |
| Installation | Proposée par une bannière, une seule fois : un refus est mémorisé. Aucun lien ne peut installer une PWA — les navigateurs l'interdisent, seul un geste de l'utilisateur le permet. Sur iPhone et iPad, la bannière affiche la marche à suivre dans Safari |

**En développement, le service worker reste éteint.** MSW pose le sien pour
intercepter les requêtes de démonstration, et une page ne peut être contrôlée
que par un seul service worker à la fois. La PWA ne s'active donc qu'en mode
`live`, sur un build de production (`npm run build && npm run preview`).

### Le navigateur propose d'ouvrir dans une autre application

Si un bandeau **« Ouvrir dans l'appli »** apparaît dans la barre d'adresse alors
que PASET s'affiche correctement, ce n'est pas un défaut de PASET : une autre
PWA, installée depuis ce même `localhost:<port>`, réclame l'origine. Toutes les
applications de développement partageant l'hôte `localhost`, **n'importe quel
port peut avoir été réclamé** par une installation antérieure.

Deux remèdes, cumulables :

1. Laisser le lanceur choisir son port — c'est le comportement par défaut, et
   il part de 8492 précisément pour éviter la plage encombrée.
2. Désinstaller les PWA de développement devenues inutiles :
   `edge://apps` (ou `chrome://apps`), puis désinstaller les entrées `localhost`.
   Pour effacer aussi le service worker resté en place : *DevTools →
   Application → Service Workers → Unregister*, puis *Storage → Clear site data*.

### Ce qui fonctionne hors ligne, et ce qui reste à faire

Fonctionne : l'application **se lance** sans réseau, et les données déjà
consultées restent affichées (dernière synchronisation en cache).

À construire : la **soumission** d'un formulaire hors ligne. La file d'attente
(`syncQueue` + IndexedDB via Dexie) n'est aujourd'hui câblée que sur l'ancienne
feature `collection` ; la feature `formulaires` — celle de la collecte native —
poste directement à l'API et échoue donc sans réseau. C'est le chantier suivant
décrit dans [docs/approche-collecte-native.md](docs/approche-collecte-native.md).
