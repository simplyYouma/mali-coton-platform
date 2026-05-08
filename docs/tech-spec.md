# Spécification Technique Frontend — Plateforme Mali Coton (PNUD)

> Document de référence technique pour la **maquette interactive (Livrable L2)** et son intégration future avec le backend (L3).
> Version : 1.0 — Auteur : Fatoumata Youma Sokona (UI/UX Lead).
> Aligné sur CDC v2 §3 (Architecture), §5 (Fonctionnalités), §8 (Exigences qualité non négociables).

---

## 1. Objectif du document

Définir **comment la maquette est construite** pour que :

1. Elle soit **présentable au client** comme prototype interactif (parcours des 3 profils, écrans clés).
2. Elle soit **directement réutilisable** par les développeurs backend sans réécriture du frontend (composants typés, contrats API définis, états et erreurs prévus).
3. Elle respecte **dès la maquette** les contraintes non négociables : offline-first, RBAC, scalabilité, sécurité, i18n FR/BM.

---

## 2. Stack technique retenue

| Couche | Choix | Justification |
|---|---|---|
| Framework | **React 18 + TypeScript strict** | Recommandé CDC §3.2 ; écosystème maquette/Storybook mature ; recrutement facile |
| Build | **Vite** | Démarrage rapide, build optimisé, support PWA natif |
| Routing | **React Router v6** | Standard, lazy loading par module |
| State serveur | **TanStack Query (React Query)** | Cache, retry, offline mutations, parfait pour API REST |
| State client | **Zustand** | Léger, typé, sans boilerplate (pas de Redux) |
| Forms | **React Hook Form + Zod** | Validation schéma, performant, intégration native champs custom |
| Charts | **Chart.js v4 + react-chartjs-2** | CDC §3.2 ; léger ; alternative D3 si besoins avancés Phase 2 |
| Cartographie | **Leaflet** (Phase 1) → **MapLibre GL** (Phase 2 OGC WMS/WFS) | CDC §3.2 |
| i18n | **i18next + react-i18next** | FR + BM, clés JSON, support pluralisation |
| Tests | **Vitest** (unit) + **Testing Library** + **Playwright** (E2E) | Standard moderne |
| Storybook | **Storybook 8** | Catalogue de composants, validation design system |
| Styling | **CSS Modules + variables CSS** | Pas de runtime CSS-in-JS (perf) ; tokens centralisés |
| Lint/format | **ESLint + Prettier + TypeScript strict** | CI obligatoire |

> **Note importante** : la maquette L2 est livrée comme une **app React fonctionnelle avec données mockées** (pas uniquement des images statiques) — c'est explicitement requis par les critères du Livrable L2 (CDC §6.2).

---

## 3. Architecture de l'application

Architecture **feature-based** + couches strictes (CDC §3.1) :

```
src/
├── app/                      # Bootstrap, providers, router
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers/            # QueryClient, i18n, Theme, Auth, Offline
├── features/                 # Modules métier (1 dossier = 1 module CDC §5)
│   ├── auth/
│   ├── sites/                # Module 1 — Gestion des sites
│   ├── collection/           # Module 2 — Collecte terrain
│   ├── dashboard/            # Module 3 — Tableaux de bord
│   ├── admin/                # Module 4 — Sécurité & administration
│   ├── mapping/              # Module 5 — Cartographie (Phase 2)
│   ├── analytics/            # Module 6 — Analytics avancés (Phase 2)
│   ├── reporting/            # Module 7 — Reporting auto (Phase 2)
│   └── alerts/               # Module 8 — Alertes (Phase 2)
│       ├── components/       # UI propre au feature
│       ├── hooks/            # Hooks métier (useAlerts, useResolveAlert)
│       ├── api/              # Appels API + types
│       ├── pages/            # Pages routées
│       └── types.ts
├── components/
│   └── common/               # Design system — composants partagés (cf. design-system.md §5.1)
├── lib/                      # Utilitaires purs (formatters, validators, geo)
├── styles/
│   ├── tokens.css            # Tokens design system (couleurs, typo, espaces)
│   ├── reset.css             # Reset complet (override styles navigateur — CDC §12)
│   └── globals.css
├── i18n/
│   ├── fr/                   # Fichiers JSON par feature
│   └── bm/
├── mocks/                    # MSW handlers + données fixtures (maquette L2)
│   ├── handlers/
│   └── fixtures/
└── types/                    # Types globaux partagés
```

### Règles de séparation (CDC §3.1)

- **Domain layer** : `lib/` + `features/*/types.ts` — règles métier pures, aucune dépendance React.
- **Application layer** : `features/*/hooks/` — orchestration via React Query + Zustand.
- **Infrastructure layer** : `features/*/api/` — appels HTTP, sérialisation. **Seul endroit qui parle à l'API.**
- **Interface layer** : `features/*/pages/` + `components/` — rendu, aucune logique métier.

> Aucun composant UI ne fait d'appel HTTP direct. Aucune page n'importe `axios`.

---

## 4. Profils utilisateurs et accès (RBAC)

Conforme CDC §5.1.

| Profil | Routes accessibles | Hook de garde |
|---|---|---|
| `agent` | `/collecte/*`, `/sites/:id` (lecture site assigné) | `<RoleGuard role="agent">` |
| `superviseur` | `/sites/*` (multi-sites lecture + validation), `/dashboard`, `/alerts` | `<RoleGuard role="superviseur">` |
| `admin` | Tout, plus `/admin/*` (utilisateurs, seuils, logs) | `<RoleGuard role="admin">` |

`useAuth()` retourne `{ user, role, permissions, isOffline }`.
`<RoleGuard>` rend `<AccessDenied />` ou redirige selon la stratégie configurée.

> Pour la maquette : le rôle est sélectionnable depuis un sélecteur en topbar (mode démo). En production, il vient du JWT.

---

## 5. Contrats API (préparation backend-ready)

Tous les types de domaine sont **définis côté frontend dès la maquette**, dans `features/*/api/*.types.ts`. Ils servent de **proposition de contrat** que les devs backend pourront affiner.

### 5.1 Convention REST

- Base URL : `/api/v1` (versioning obligatoire CDC §6.1).
- Authentification : `Authorization: Bearer <jwt>`.
- Erreurs : enveloppe standard `{ error: { code, message, correlationId, details? } }`.
- Pagination : `?page=1&pageSize=25` ; réponse `{ items, total, page, pageSize }`.
- Filtres : query params nommés (`?siteId=`, `?from=`, `?to=`, `?indicator=`).
- Idempotence : header `Idempotency-Key` sur les POST critiques (sync collectes).

### 5.2 Endpoints prévus (proposition initiale, à valider avec backend)

| Domaine | Endpoint | Méthode | Notes |
|---|---|---|---|
| Auth | `/auth/login` | POST | retourne JWT + profil |
| Auth | `/auth/me` | GET | profil courant |
| Sites | `/sites` | GET, POST | liste, création (admin) |
| Sites | `/sites/:id` | GET, PATCH | détail, mise à jour |
| Sites | `/sites/:id/history` | GET | historique des collectes |
| Indicateurs | `/indicators` | GET | référentiel des indicateurs (cadre §4 CDC) |
| Collectes | `/collections` | GET, POST | POST supporte sync batch offline |
| Collectes | `/collections/:id` | GET, PATCH | validation superviseur via PATCH `{status}` |
| Collectes | `/collections/sync` | POST | synchro batch avec résolution conflits |
| Mesures | `/measurements?collectionId=` | GET | détail valeurs |
| Alertes | `/alerts` | GET | filtres : `status`, `severity`, `siteId` |
| Alertes | `/alerts/:id/resolve` | POST | résolution |
| Seuils | `/thresholds` | GET, PATCH | configuration admin |
| Utilisateurs | `/users` | GET, POST, PATCH, DELETE | admin uniquement |
| Reporting | `/reports/generate` | POST | retourne URL signée vers PDF/Excel |
| Audit | `/audit-logs` | GET | journal complet |
| Géo (Ph2) | `/geo/wms`, `/geo/wfs` | GET | proxy OGC |

### 5.3 Modèles de domaine (extrait — détail complet par feature)

```ts
// features/sites/api/site.types.ts
export type SiteType = 'GALA' | 'INDIGO' | 'GALA_INDIGO' | 'NATURELLE';

export interface Site {
  id: string;
  name: string;                  // ex: "ATPEK – Centre assoc. teinture"
  legalStatus: 'formel' | 'informel';
  location: { commune: string; city: string };
  coordinates: { lat: number; lng: number };
  type: SiteType;
  workforce: number;
  createdYear: number;
  photos: string[];              // URLs signées
  isReference: boolean;          // true pour NDOMO
}

// features/collection/api/collection.types.ts
export type CollectionStatus = 'draft' | 'submitted' | 'validated' | 'rejected';
export type ConformityLevel = 'conforming' | 'warning' | 'critical';

export interface Collection {
  id: string;
  siteId: string;
  agentId: string;
  collectedAt: string;           // ISO 8601 horodaté GPS-validé
  gps: { lat: number; lng: number; accuracy: number };
  status: CollectionStatus;
  syncedAt: string | null;       // null = pas encore synchronisé
  measurements: Measurement[];
  photos: PhotoAttachment[];
  validatedBy?: string;
  validationNotes?: string;
}

export interface Measurement {
  indicatorId: string;           // FK vers /indicators
  value: number | string;
  unit: string;
  conformity: ConformityLevel;   // calculé serveur selon seuils
  thresholdSource: string;       // ex: "OMS / Norme MN-03-02/002:2006"
}
```

---

## 6. Stratégie offline-first (contrainte critique CDC §3.3 / §8.1)

> Concerne **uniquement l'app tablette de collecte**. Le back-office est online.

### 6.1 Mécanismes

1. **Service Worker** (Workbox) : cache app shell + assets.
2. **IndexedDB** (via Dexie) : persistance locale des collectes draft + référentiels.
3. **Outbox pattern** : toute mutation offline est mise en file ; rejouée à la reconnexion.
4. **Résolution de conflits** : politique *server-wins* avec notification visuelle si rejet ; brouillon conservé localement pour correction.
5. **Indicateur visuel persistant** : `<OfflineBanner>` + compteur file synchro dans topbar.

### 6.2 Cycle de vie d'une collecte offline

```
[Saisie tablette] → IndexedDB (status: draft)
       ↓ (clic "Soumettre")
[Validation locale] → IndexedDB (status: pending_sync)
       ↓ (connexion détectée)
[Outbox processor] → POST /collections/sync
       ↓
       ├─ 2xx → IndexedDB (status: submitted) + nettoyage outbox
       └─ 409 conflit → UI résolution + flag `requires_review`
```

### 6.3 Contraintes UX

- Aucun écran ne doit dépendre d'un appel réseau pour s'afficher après login.
- Toute action déclenchant une mutation indique immédiatement son état (optimistic update + badge "en attente").
- La perte de connexion en cours de saisie ne doit jamais perdre de données (sauvegarde IndexedDB à chaque champ modifié, debounce 500ms).

---

## 7. Internationalisation FR / BM

- Toutes les chaînes UI passent par `t('feature.key')`.
- Fichiers : `src/i18n/{fr,bm}/{feature}.json`.
- Format de dates : `Intl.DateTimeFormat` avec locale active (FR par défaut).
- Nombres et unités : helper `formatMeasurement(value, unit, locale)` dans `lib/format`.
- Bambara : pas de pluralisation complexe ; vérifier longueurs de chaînes (souvent 20-40% plus longues qu'en FR — prévoir l'élasticité du layout).

---

## 8. Sécurité — règles appliquées dès la maquette

Même si la maquette utilise des mocks, elle pose les bonnes bases :

- **Aucun secret en dur** (clés API, URLs sensibles) — uniquement variables d'environnement Vite (`VITE_*`).
- **Token JWT** stocké en `httpOnly cookie` côté backend ; en maquette, simulé via Zustand non persisté.
- **CSP stricte** définie dans `index.html` + en-têtes serveur.
- **Sanitisation** systématique des contenus dynamiques (DOMPurify pour les rares champs HTML).
- **Pas de `dangerouslySetInnerHTML`** sauf avec sanitisation explicite.
- **RBAC vérifié à 2 niveaux** : routes (`<RoleGuard>`) + composants sensibles (boutons admin masqués pour non-admins, en plus du contrôle backend).
- **Anonymisation** : les données santé des artisanes ne sont jamais affichées avec identifiants directs (CDC §3.4).

---

## 9. Performance & qualité

- **Code-splitting** par route (`React.lazy` + Suspense).
- **Pagination obligatoire** sur toute liste (CDC §11).
- **Virtualisation** (`@tanstack/react-virtual`) si > 200 lignes.
- **Lighthouse cible** : Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95.
- **Bundle budget** : ≤ 250 KB gzipped initial route.

---

## 10. Tests (CDC §5)

| Niveau | Outil | Périmètre minimum L2 |
|---|---|---|
| Unit | Vitest | Helpers `lib/`, validateurs Zod, hooks métier |
| Composant | Testing Library + Storybook play | Chaque composant `common/` |
| Intégration | Testing Library + MSW | Parcours par feature (création site, soumission collecte) |
| E2E | Playwright | 3 parcours utilisateurs des 3 profils (CDC L2 critère) |
| A11y | `@axe-core/react` en dev + axe Playwright | Zéro violation critique |

Le **rapport de tests utilisateurs initiaux** (critère L2) sera produit à partir de sessions Playwright + observations terrain documentées.

---

## 11. Mocks et données de démonstration (L2)

- **MSW (Mock Service Worker)** intercepte les appels `/api/v1/*` en dev et dans la maquette livrée.
- Fixtures réalistes basées sur les **5 sites pilotes réels** du CDC §1.3 (ATPEK, Dianéguéla, GALA-NI-MASSIRIW, DJIGUIYASO, NDOMO ★).
- Indicateurs et seuils issus du **cadre §4 du CDC** (eaux, sol, air, déchets, santé, socio-éco).
- Valeurs de mesures inspirées des constats terrain réels (pH 9.62, 11.25, etc. — CDC §1.2).
- Bascule `?mock=on/off` ou variable env pour basculer mocks ↔ API réelle quand le backend sera prêt.

> Cette approche garantit que **la transition vers le vrai backend = remplacement transparent des handlers MSW**, sans toucher au code métier ni aux composants.

---

## 12. Livraison maquette L2 — checklist de complétude

- [ ] Parcours complets des 3 profils (agent / superviseur / admin)
- [ ] Toutes les pages MVP Phase 1 (Modules 1-4)
- [ ] Aperçus des écrans Phase 2 (cartographie, alertes, reporting, analytics)
- [ ] App tablette de collecte navigable (mode offline simulé)
- [ ] Storybook accessible avec tous composants `common/`
- [ ] Système d'alertes avec scénarios de dépassement (vert/orange/rouge sur seuils OMS/maliens)
- [ ] Fiches sites des 5 sites pilotes avec données réalistes
- [ ] Bilingue FR/BM démontré sur au moins l'app de collecte
- [ ] Rapport de tests utilisateurs initiaux
- [ ] Documentation : ce fichier + `design-system.md` + README de démarrage

---

## 13. Ce qui n'est PAS fait dans la maquette (pour éviter d'empiéter sur les devs back/data/devops)

- Aucune logique d'agrégation/ETL réelle (les KPI sont mockés).
- Aucune persistance serveur ni base de données.
- Aucune génération réelle de rapports PDF/Excel (boutons fonctionnels qui simulent).
- Aucun calcul réel de seuil de conformité (la valeur `conformity` est posée dans les fixtures).
- Aucune intégration cartographique OGC WMS/WFS Phase 2 (Leaflet simple en Phase 1).
- Aucune configuration Docker/K8s/CI-CD (équipe DevOps).

> Ces éléments sont **volontairement laissés au backend / devops / data**. La maquette s'arrête à la frontière API contractuelle définie en §5.
