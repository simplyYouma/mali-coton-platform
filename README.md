# Mali Coton — Plateforme PNUD

Plateforme numérique de suivi socio-environnemental des sites de teintureries artisanales au Mali.

**Projet** : Renforcement de la Durabilité du Secteur Textile au Mali — *UNDP-MLI-00492*
**Maître d'ouvrage** : PNUD Mali
**Cabinet retenu** : Consortium Sahel Analytics (Lead) & Sahel Environnement
**Livrable courant** : L2 — Maquette interactive validée

---

## Démarrage

```bash
npm install
npm run dev
```

L'application est accessible sur http://localhost:5173.

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur PNUD | `admin@pnud.org` | `demo` |
| Superviseur | `superviseur@sahel.com` | `demo` |
| Agent terrain (Bamako) | `agent.bamako@sahel.com` | `demo` |
| Agent terrain (Ségou) | `agent.segou@sahel.com` | `demo` |

## Scripts

| Commande | Description |
|---|---|
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

## Mode hors-ligne (app tablette)

L'application de collecte fonctionne intégralement sans connexion. Les données sont persistées localement (IndexedDB via Dexie) et synchronisées automatiquement à la reconnexion via un *outbox pattern*.
