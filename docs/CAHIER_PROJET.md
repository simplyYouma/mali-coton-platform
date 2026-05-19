# Cahier du projet — PASET Mali Coton

> **Plateforme de monitoring socio-environnemental des sites de teinture artisanale au Mali.**
>
> Ce document est la **référence officielle** du projet. Il consolide le contexte, les acteurs, le modèle de données, l'API backend, l'architecture frontend, les principes UX, et la roadmap. Un dev qui débarque sur le projet doit pouvoir, après lecture, comprendre où on va et où on en est.

---

## 1. Contexte du projet

### 1.1 Cadre
- **Programme** : PASET Mali Coton, financement PNUD (UNDP-MLI-00492).
- **Objectif** : suivi environnemental, sanitaire et social des **ateliers de teinture artisanale** (filière coton) à Bamako et Ségou.
- **Cible** : 6 sites pilotes, ~600 teinturiers·ères, sur 3 années.
- **Partenaire principal de collecte** : Sahel Environnement (questionnaire Kobo `mali_coton_se_v2`).
- **Laboratoire de référence** : LNE (Laboratoire National des Eaux, Bamako). D'autres labos peuvent intervenir (LNS, Sotuba IER, CNRST).

### 1.2 Parties prenantes
| Acteur | Rôle | Accès plateforme |
|---|---|---|
| **PNUD / Administrateur** | Pilotage, paramétrage, exports, vue nationale | Oui, rôle `admin` |
| **Superviseur** | Validation collectes, suivi labo, déclenchement actions | Oui, rôle `superviseur` |
| **Agent terrain** | Saisie des collectes via Kobo Toolbox sur tablette | **Non — Kobo uniquement** |
| **Laboratoire** | Analyses physico-chimiques, rendu de bordereaux | **Non — e-mail/courrier** |
| **Observateur** | Lecture seule (donateurs, ONG partenaires) | Oui, rôle `visitor` |

> ⚠️ **Principe fondamental** : ni l'agent terrain, ni le laboratoire n'ont besoin d'un compte sur la plateforme. Toute la couche d'inscription / contact / coordination passe par le superviseur. Voir §5 (Pipeline Kobo) et §7 (Workflow labo).

---

## 2. Sources de données

### 2.1 Le questionnaire Kobo (Sahel Environnement)

Form ID : **`mali_coton_se_v2`**, version `2026050102`.

Le questionnaire contient **7 sections** :

| Section | Description | Mode |
|---|---|---|
| **A — Identification** | id_echantillon, id_collecte_sa, dates, agent, site, **point de prélèvement**, GPS, photo principale | obligatoire |
| **B — Eaux usées in-situ** | T°, pH, conductivité, turbidité, TDS | in-situ |
| **C — Eaux usées labo** | MES, coloration, DBO5, DCO, NH4, NO2, NO3, P total, sulfates + 12 métaux | labo |
| **D — Sol in-situ** | pH du sol, conductivité électrique sol | in-situ |
| **E — Sol labo** | 12 métaux en mg/kg | labo |
| **F — Air in-situ** | PM10, PM2.5, CO, NO, NO2, CO2, SO2 | in-situ |
| **G — Air labo** | COV (composés organiques volatils) | labo |

Plus, en fin de saisie :
- `conformite_globale` : conforme / non_conforme / partiel / non_evalue (déclarée par l'agent)
- `ref_rapport_labo` : référence officielle du rapport LNE
- `obs_generales` + observations par groupe

### 2.2 Format des identifiants

- **`id_collecte_sa`** : identifiant logique stable de la collecte (UUID Kobo). Reste identique entre la première soumission et toutes les corrections.
- **`id_echantillon`** : format `ECH-SITEXX-YYYYMMDD-NNN`. Étiquette physique imprimée et collée sur le flacon.

### 2.3 Points de prélèvement (référentiel canonique)

9 valeurs, à respecter :

| Code | Libellé | Domaine |
|---|---|---|
| `effluent_sortie` | Effluent en sortie d'atelier | Eaux |
| `canal_drainage` | Canal de drainage | Eaux |
| `cours_eau_amont` | Cours d'eau en amont du site | Eaux |
| `cours_eau_aval` | Cours d'eau en aval du site | Eaux |
| `puits_temoin` | Puits témoin (de référence) | Eaux |
| `sol_direct` | Sol à l'aplomb du rejet | Sol |
| `sol_reference` | Sol de référence (terrain témoin) | Sol |
| `air_interieur` | Air intérieur de l'atelier | Air |
| `air_exterieur` | Air extérieur (cour, périphérie) | Air |

### 2.4 Sites pilotes (à reprendre du backend)

Les sites doivent être chargés depuis l'API `/api/site_teintures` (codes officiels `SITE01` à `SITE06`). En attendant le branchement live, fixtures alignées sur ces codes.

### 2.5 Inputs DIAWARA (feedback client mi-projet)

7 axes prioritaires identifiés par le sponsor :

1. **Dashboard exécutif** : score environnemental, niveau de risque, conformité, alertes critiques.
2. **Cartographie** : heatmaps, niveaux de pollution, évolution temporelle.
3. **Contrôle qualité données** : détection automatique d'incohérences, scoring qualité, audit trail, validation sup/admin.
4. **Offline-first** : sync auto critique pour les agents (contexte terrain Mali).
5. **UX/UI** : hiérarchisation, allègement, feedbacks visuels, expérience tablette.
6. **Alertes intelligentes** : seuils, absence de collecte, dysfonctionnement, données anormales.
7. **Scalabilité** : architecture modulaire, évolutive, interopérable.

Ces axes alimentent la roadmap (§11).

---

## 3. Backend API — modèle officiel cible

### 3.1 Stack
- **API Platform 3** (Symfony, JSON-LD, Hydra).
- **OpenAPI 3.1** exposé sur `/api/docs.jsonopenapi`.
- **Base URL** : `http://187.127.225.182/`
- Authentification : à confirmer (non visible dans les schémas — probablement JWT à brancher).

### 3.2 Les 18 ressources REST

```
Region          → /api/regions
Cercle          → /api/cercles
Commune         → /api/communes
SiteTeinture    → /api/site_teintures
User            → /api/users
Role            → /api/roles
Permission      → /api/permissions
Laboratoire     → /api/laboratoires
ParametreAnalyse → /api/parametre_analyses
ParametreUnite  → /api/parametre_unites
NormeRejet      → /api/norme_rejets
CollecteTerrain → /api/collecte_terrains
Prelevement     → /api/prelevements
Echantillon     → /api/echantillons
AnalyseLaboratoire → /api/analyse_laboratoires
ResultatAnalyse → /api/resultat_analyses
ValidationSuperviseur → /api/validation_superviseurs
Recommandation  → /api/recommandations
```

Chaque ressource expose `GET (list)`, `GET (item)`, `POST`, `PUT`, `PATCH`, `DELETE`.

### 3.3 Hiérarchie réelle (à comprendre absolument)

```
Region
  └── Cercle
        └── Commune
              └── SiteTeinture
                    └── CollecteTerrain  ← UNE visite de l'agent
                          └── Prelevement  ← UN point de prélèvement (1 visite → N prélèvements)
                                └── Echantillon  ← UN flacon (1 prélèvement → 1..N échantillons)
                                      └── AnalyseLaboratoire  ← UNE demande d'analyse au labo
                                            └── ResultatAnalyse  ← UN paramètre mesuré
                                                  └── ValidationSuperviseur  ← validation PAR résultat

Référentiels :  ParametreAnalyse → ParametreUnite
                NormeRejet
Action :        Recommandation
Sécurité :      User / Role / Permission
```

### 3.4 Schémas détaillés (champs clés)

#### `Region`
`id, nom, code, cercles[]`

#### `Cercle`
`id, nom, code, region (IRI), communes[]`

#### `Commune`
`id, nom, code, cercle (IRI), siteTeintures[]`

#### `SiteTeinture`
`id, codeSite (SITE01..), nomSite, latitude, longitude, region, commune (IRI), quartier, typeSite, statutFoncier, superficie, responsableNom, responsableContact, nombreFemmes, nombreHommes, nombreTotal, niveauFormalisation, collecteTerrains[], recommandations[]`

#### `User`
`id, nom, prenom, email, password, actif, roles[]`
> ⚠️ Côté backend, **un User est un compte plateforme** (admin/sup/observateur). Les agents terrain et préleveurs sont des **strings libres** sur Collecte/Prélèvement, pas des Users.

#### `Role`
`id, code, libelle, permissions[]`

#### `Permission`
`id, code, libelle`

#### `Laboratoire`
`id, code, nom, adresse, telephone, email, typeLaboratoire, echantillons[], analyseLaboratoires[]`

#### `ParametreAnalyse`
`id, nom, categorie, description, unite (IRI ParametreUnite), normeRejets[], resultatAnalyses[]`

#### `ParametreUnite`
`id, libelle, sigle (mg/L, NTU, µg/m³…)`

#### `NormeRejet`
`id, parametre (IRI), milieu (eau/sol/air), valeurMin, valeurMax, referenceNorme (OMS 2017…), description, actif`

#### `CollecteTerrain` ⭐
`id, siteTeinture (IRI), codeCollecte, typeCollecte, dateCollecte, agentCollecte (string), latitude, longitude, statut, sourceSystem, externalId, submittedAt, rawPayload[], observations, prelevements[], recommandations[]`

> **`sourceSystem` + `externalId` + `rawPayload`** = pattern d'ingestion Kobo. La plateforme garde l'origine et le payload original.

#### `Prelevement` ⭐
`id, collecteTerrain (IRI), codePrelevement, typePrelevement (eau/sol/air), pointPrelevement, latitude, longitude, datePrelevement, heurePrelevement, prelevePar (string), conditionnement, observations, echantillons[]`

#### `Echantillon`
`id, prelevement (IRI), codeEchantillon (ECH-SITEXX-…), typeEchantillon, statut, dateEnvoiLaboratoire, dateReceptionLaboratoire, laboratoire (IRI), observations, analyseLaboratoires[]`

#### `AnalyseLaboratoire`
`id, echantillon (IRI), laboratoire (IRI), numeroRapport, dateAnalyse, fichierRapport (URL PDF), statut, observations, resultatAnalyses[]`

#### `ResultatAnalyse`
`id, analyseLaboratoire (IRI), parametreAnalyse (IRI), valeur (string — gère "<0.01"), unite (string snapshot), seuilNorme (string snapshot), conforme (bool), commentaire, validationSuperviseur (IRI), recommandations[]`

#### `ValidationSuperviseur`
`id, resultatAnalyse (IRI), statut, decision (validé/rejeté/correction), commentaire, validePar (string), dateValidation`

> La validation est **par résultat**, pas par collecte entière. Le sup peut valider 3 paramètres et demander une ré-analyse sur un 4ᵉ.

#### `Recommandation`
`id, siteTeinture (IRI) | collecteTerrain (IRI) | resultatAnalyse (IRI), titre, description, niveauPriorite, statut, responsableSuivi (string), dateEcheance`

> Attachable à un site, une collecte ou un résultat. Peut générer un plan d'action.

---

## 4. Architecture frontend actuelle

### 4.1 Stack
- **React 18 + TypeScript strict + Vite 5** (build < 10s).
- **CSS Modules** + tokens centralisés (`src/styles/tokens.css`).
- **React Router 6** (routes dans `src/app/routes.tsx`).
- **TanStack Query v5** (provider dans `src/app/providers/QueryProvider.tsx` — `staleTime: 0` + `refetchOnMount: 'always'` + `refetchOnWindowFocus: true` pour ne jamais avoir besoin de F5).
- **Zustand** pour l'état UI (sidebar collapsed/mobileOpen).
- **MSW 2** pour le mock backend complet pendant la maquette (`src/mocks/handlers/`).
- **Dexie** pour la persistance offline (cache labos, sync queue).
- **Leaflet** pour la cartographie.
- **Chart.js** pour les graphiques (avec palette `--chart-1..6`).
- **lucide-react** pour les icônes.
- **date-fns** (durci dans `src/lib/format.ts` pour accepter null/undefined/"").

### 4.2 Structure
```
src/
├── app/
│   ├── App.tsx
│   ├── routes.tsx              # Toutes les routes + RoleGuard
│   ├── layouts/AppLayout.tsx   # Sidebar + Topbar + Outlet
│   └── providers/              # Auth, Theme, I18n, Toast, Sidebar, Query
├── components/common/          # Badge, Button, Modal, Tabs, Input, Select, …
├── features/                   # 1 dossier par domaine fonctionnel
│   ├── admin/                  # /admin/* (users, roles, indicateurs, seuils, audit, refdata)
│   ├── alerts/                 # /alertes
│   ├── analytics/              # /analytics
│   ├── auth/                   # /login
│   ├── collection/             # /collecte, /collecte/:id, /collecte/validation, /collecte/import
│   ├── dashboard/              # /dashboard
│   ├── lab/                    # /labo/echantillons (sup-only)
│   ├── mapping/                # /cartographie
│   ├── reporting/              # /reporting
│   ├── sites/                  # /sites, /sites/:id
│   └── team/                   # /agents, /agents/:id
├── lib/                        # http client, format, uuid
├── mocks/
│   ├── fixtures/               # Données mockées (collections, sites, users, labs, …)
│   └── handlers/               # MSW handlers REST
├── styles/                     # tokens.css + globals
└── types/                      # types communs
```

### 4.3 Tokens & système de design
- **Couleurs** : `--color-primary` (#418fde UN-blue), `--color-ink-night` (#0e1730), `--color-accent` (#14b8a6 mint).
- **Sémantique** : `--color-success`, `--color-amber`, `--color-danger`, avec leurs `-soft`, `-hover`, `-bg`.
- **Typographie** : échelle `--text-mega`, `--text-stat`, `--text-card`, `--text-h1..h3`, `--text-md/sm/xs/2xs`.
- **Familles** : `--font-display` (titres), `--font-mono` (codes, dates).
- **Espacements** : `--space-1..6`.
- **Rayons** : `--radius-sm/md/lg/pill`.

---

## 5. Pipeline d'ingestion Kobo → Plateforme

### 5.1 Le contrat d'entrée

```
[Agent saisit sur tablette Kobo Toolbox]
       │
       ▼
[Kobo Server : POST sur webhook plateforme]
       │  ou
       │  Plateforme PULL périodique /api/v2/assets/{form}/data/
       │  ou
       │  Import CSV manuel par superviseur (/collecte/import)
       ▼
[POST /api/v1/kobo/webhook] ← endpoint plateforme
       │
       ▼
[Validation schéma JSON] ← rejet si requis manquants
       │
       ▼
[Résolution référentiels] ← site_code → SiteTeinture, agent → string libre,
       │                    point_prelev → vocabulaire canonique
       ▼
[Création ou MAJ CollecteTerrain]
   ├── id_collecte_sa nouveau → CREATE (statut = "soumise")
   └── id_collecte_sa existant → UPDATE (révision — voir §5.3)
       │
       ▼
[Création des Prelevements] ← 1 par point de prélèvement saisi
       │
       ▼
[Création des Echantillons]  ← pour les indicateurs labo (lab_pending)
       │
       ▼
[Scoring qualité auto] ← incohérences, GPS hors site, photo manquante, plages physiques
       │
       ▼
[Évaluation conformité] ← chaque résultat in-situ vs NormeRejet
       │
       ▼
[Déclenchement alertes] ← seuil dépassé, silence site, data quality
       │
       ▼
[Notification superviseur] ← e-mail/SMS si data anormale
```

### 5.2 Mapping des champs

| Champ Kobo / xlsform | Cible backend |
|---|---|
| `id_collecte_sa` | `CollecteTerrain.externalId` (+ `sourceSystem = 'kobo'`) |
| `id_echantillon` | `Echantillon.codeEchantillon` |
| `site_code` | résolu en `SiteTeinture` (via `codeSite`) |
| `agent` | `CollecteTerrain.agentCollecte` (string) |
| `point_prelev` | `Prelevement.pointPrelevement` |
| `date_prelevement` | `Prelevement.datePrelevement` |
| `gps_prelevement` | `Prelevement.latitude/longitude` |
| `photo_prelevement` | upload + URL en `CollecteTerrain.rawPayload.photo` |
| Sections B/D/F (in-situ) | `ResultatAnalyse` avec acquisition in-situ |
| Sections C/E/G (labo) | `Echantillon` créé, en attente d'analyse |
| `obs_eau/sol/air/cov` | `Prelevement.observations` par milieu |
| `ref_rapport_labo` | `AnalyseLaboratoire.numeroRapport` |
| `conformite_globale` | `CollecteTerrain.declaredConformity` (à ajouter) |
| Le JSON brut complet | `CollecteTerrain.rawPayload` |

### 5.3 Boucle de correction (re-soumission par Kobo)

Quand un agent corrige une collecte refusée par le superviseur :
1. Le sup envoie un e-mail/SMS à l'agent (via la plateforme, mais l'agent reçoit l'info hors-plateforme).
2. L'agent rouvre la collecte dans Kobo (même `id_collecte_sa`).
3. Il corrige et re-soumet → nouveau `version` Kobo, **même** `id_collecte_sa`.
4. La plateforme reconnaît la version par `externalId` et **incrémente une révision** sur la même `CollecteTerrain`.

L'historique des révisions est tracé : la version actuelle est jouée, les versions antérieures sont conservées en révisions (audit).

---

## 6. Modèle de données actuel ↔ cible

### 6.1 Tableau de mapping

| Concept | API client (cible) | Frontend actuel | Action |
|---|---|---|---|
| Niveau admin | Region → Cercle → Commune | `location.commune` (string) | **Phase A3** : créer fixtures + filtres |
| Site | `SiteTeinture` | `Site` | **Phase A1** : aligner champs |
| Visite | `CollecteTerrain` | `Collection` | **Phase B1** : ajouter `codeCollecte`, `typeCollecte`, `sourceSystem`, `externalId`, `rawPayload`, `submittedAt` |
| Prélèvement | `Prelevement` | (fusionné dans Collection) | **Phase B1** : extraire entité — porte le `pointPrelevement` |
| Échantillon | `Echantillon` | `Measurement.sample` | **Phase B2** : entité top-level avec `codeEchantillon`, statut, dates labo |
| Demande d'analyse | `AnalyseLaboratoire` | (implicite) | **Phase B3** : entité avec `numeroRapport`, `fichierRapport`, statut |
| Résultat | `ResultatAnalyse` | `Measurement` | **Phase B4** : renommer, ajouter `seuilNorme` (snapshot) |
| Validation | `ValidationSuperviseur` | bloc sur Collection | **Phase B5** : par résultat (plus par collecte) |
| Paramètre | `ParametreAnalyse` (BDD) | `IndicatorRule` (code) | **Phase A2** : table éditable côté admin |
| Unité | `ParametreUnite` (BDD) | string sur Indicator | **Phase A2** |
| Norme | `NormeRejet` (BDD) | minOk/maxOk | **Phase A2** |
| Recommandation | `Recommandation` | ❌ absent | **Phase C1** : nouveau module |
| RBAC | `Role` + `Permission` | matrice localStorage | **Phase C2** : tables formelles |
| Agent terrain | `string` sur CollecteTerrain | `User role='agent'` (notre fiche Agent) | **conservé** comme module Agents (référentiel de contacts), mais en interne `agentCollecte` reste un nom |
| Labo | `Laboratoire` | `Lab` | aligner `typeLaboratoire`, `code` |

### 6.2 Conservations volontaires
- **Module Agents** (`/agents`) : reste un référentiel de contacts (nom, e-mail, téléphone, sites assignés, compte Kobo). Sert au sup pour notifier. Pas mappé sur l'entité `User` backend ; le nom de l'agent finit en `CollecteTerrain.agentCollecte` (string).
- **Domaines santé / socio / déchets** : conservés dans le modèle (le client peut avoir d'autres sources que Sahel Environnement).
- **LNE n'est pas codé en dur** : reste un labo parmi tant d'autres dans `Laboratoire`. Le champ `isReference` permet de le marquer.

---

## 7. Workflow laboratoire (sup-driven)

### 7.1 Pourquoi le labo n'a pas accès à la plateforme
Décision projet : le laboratoire travaille hors plateforme (e-mail, courrier). Le superviseur fait le pont. C'est plus simple, plus réaliste, et évite de devoir provisionner des comptes labo.

### 7.2 Le cycle d'un flacon

| Statut | Acteur | Action |
|---|---|---|
| `prepared` | Agent (Kobo) | Étiquète le flacon, soumet collecte |
| `sent` | Superviseur | "Marquer envoyé au labo" — choisit le labo, plateforme envoie un e-mail à `lab.contactEmail` |
| `received_at_lab` | Superviseur (optionnel) | Si le labo confirme réception |
| `in_analysis` | Superviseur (optionnel) | Si le labo communique l'état |
| `bordereau_returned` | Superviseur | "Saisir le bordereau" — tape les valeurs + référence + upload PDF |
| `accepted` | Superviseur | Validation collecte → bordereau accepté |
| `refused_by_lab` | Superviseur | "Le labo a refusé" — motif (volume insuffisant, flacon cassé). Agent + sup notifiés. |
| `rejected_by_supervisor` | Superviseur | "Renvoyer pour ré-analyse" — motif. Labo notifié par e-mail. |

### 7.3 Page `/labo/echantillons` (admin + superviseur uniquement)

4 onglets :
- **À envoyer** (`prepared`)
- **Au labo** (`sent` / `received_at_lab` / `in_analysis`)
- **Bordereaux reçus** (`bordereau_returned` / `rejected_by_supervisor`)
- **Clôturés** (`accepted` / `refused_by_lab`)

### 7.4 Ajout d'un labo à la volée
Quand le sup choisit le labo destinataire, un bouton **"+ Ajouter un laboratoire"** ouvre une modale (nom, ville, e-mail, téléphone, SLA). Le nouveau labo est ajouté au référentiel et auto-sélectionné. C'est important : rien ne vient par magie.

---

## 8. Principes UX adoptés (non négociables)

Ces principes ont été calibrés au fil du projet. **Tout nouvel écran doit s'y conformer.**

### 8.1 Soft & pro, jamais surchargé
- Cartes avec rayon `14px`, ombre **très** subtile (`0 1px 2px rgba(15,23,42,0.03)`).
- Bordures `--color-border` (gris très clair), pas de gros traits.
- Pas de neumorphisme, pas de glassmorphism. Du flat aéré.

### 8.2 Pas de prose verbeuse
- **Titres parlent d'eux-mêmes**, on retire les sous-titres explicatifs ("Validez la collecte pour transmission définitive en base centrale…").
- Pas de descriptions de modales qui répètent le titre.
- Si une info n'est pas cruciale, elle n'apparaît pas.

### 8.3 Hiérarchisation visuelle
- Icône **à gauche** du texte dans les titres de section (jamais empilée au-dessus).
- Une seule fois la même info par page (pas de duplication "par Aïcha Touré" dans le hero + carte Agent en dessous).
- Le contenu important en haut, les détails techniques en bas (timeline, versions Kobo).

### 8.4 Actions contextuelles
- **Dock flottant** pour les actions superviseur (bouton fixe bottom-right) : visible quel que soit le scroll.
- Boutons primaires alignés à droite.
- Actions destructrices (rejet, suppression) en `danger`, jamais en primary.

### 8.5 Listes plutôt que cards
- Quand on a une collection d'items similaires, **vue tableau / liste** (ligne par item) plutôt que cards. Plus dense, plus pro (cf. agents, collectes, alertes, flacons).
- Les cards sont réservées aux cas où on a vraiment besoin de hiérarchie visuelle forte (dashboard KPIs).

### 8.6 Données copiables / cliquables
- Tout ID, e-mail, téléphone : cliquable (mailto:, tel:) ou copiable.
- Noms d'agents, de sites : liens vers leur fiche.

### 8.7 Fraîcheur des données
- `QueryClient` configuré pour `staleTime: 0` + `refetchOnMount: 'always'` + `refetchOnWindowFocus: true`. Plus jamais besoin de F5.

### 8.8 Helpers durcis
- `formatDateTime` / `formatRelativeTime` acceptent null/undefined/"" et retournent `'—'` (jamais de RangeError date-fns).

### 8.9 Mobile-first sidebar
- Sidebar deep blue (`--color-ink-night`).
- Sur mobile : drawer slide-in avec backdrop (z-index correct).
- Hamburger dans le Topbar, fermeture auto au NavLink click.

### 8.10 Génération déterministe
- Les résumés d'alertes, les chronologies sont **générés depuis les champs structurés**, pas hardcodés. Si on change un seuil, le texte change tout seul.

---

## 9. Référentiels canoniques

### 9.1 Indicateurs (paramètres d'analyse)

Étendre `IndicatorRule` actuel pour couvrir les ~40 indicateurs du questionnaire :

#### Eaux usées in-situ
| ID | Libellé | Unité | Méthode | Norme |
|---|---|---|---|---|
| `water.temperature` | Température | °C | Thermomètre portable | OMS / MN-03-02 |
| `water.ph` | pH eaux usées | — | pH-mètre portable | OMS 6,5–8,5 |
| `water.conductivity` | Conductivité | µS/cm | Conductimètre portable | Norme malienne |
| `water.turbidity` | Turbidité | NTU | Turbidimètre portable | Norme malienne |
| `water.tds` | TDS | mg/L | Capteur portable | OMS 2017 |

#### Eaux usées labo
| ID | Libellé | Unité | Méthode |
|---|---|---|---|
| `water.mes` | MES | mg/L | Gravimétrie |
| `water.color` | Coloration | Pt-Co | Spectrophotométrie |
| `water.dbo5` | DBO5 | mg O₂/L | Méthode dilution |
| `water.dco` | DCO | mg O₂/L | Dichromate |
| `water.nh4` | Azote ammoniacal | mg/L | Spectrophotométrie |
| `water.no2` | Nitrites | mg/L | Spectrophotométrie |
| `water.no3` | Nitrates | mg/L | Spectrophotométrie |
| `water.phosphorus` | P total | mg/L | Spectrophotométrie |
| `water.sulfates` | Sulfates | mg/L | Spectrophotométrie / OMS ≤ 250 |

#### Métaux eaux (labo, AAS)
| ID | Libellé |
|---|---|
| `water.metals.fe` | Fer |
| `water.metals.cr3` | Chrome III (Cr³⁺) |
| `water.metals.cr6` | Chrome VI (Cr⁶⁺) ⚠️ critique en teinture |
| `water.metals.cu` | Cuivre |
| `water.metals.zn` | Zinc |
| `water.metals.pb` | Plomb |
| `water.metals.ni` | Nickel |
| `water.metals.co` | Cobalt |
| `water.metals.mn` | Manganèse |
| `water.metals.na` | Sodium |
| `water.metals.k` | Potassium |
| `water.metals.cd` | Cadmium |

#### Sol
- In-situ : pH (5,5–8,5), conductivité électrique
- Labo : 12 métaux en mg/kg (mêmes que eaux)

#### Air
- In-situ : PM10 (≤50 µg/m³), PM2.5 (≤25), CO, NO, NO2, CO2 (≤1000 ppm), SO2
- Labo : COV par PID

### 9.2 Validité physique vs conformité normative
Distinguer dans `ParametreAnalyse` :
- `validMin / validMax` (impossibilité physique — pH ne peut pas être 99)
- `minOk / maxOk` (plage de conformité normative — pH conforme 6,5–8,5)

Une valeur hors validité physique → **erreur de saisie** → rejet à l'ingestion.
Une valeur hors plage normative → **non-conformité** → alerte.

---

## 10. Modules de la plateforme

| Route | Module | Rôle d'accès | Description |
|---|---|---|---|
| `/login` | Auth | tous | Connexion |
| `/dashboard` | Dashboard | admin/sup/visitor | KPIs exécutifs (à enrichir : score env, niveau risque, conformité, alertes critiques) |
| `/sites` | Sites | tous | Liste sites en table (Site / Type / Localisation / Effectif / Conformité) |
| `/sites/:id` | Site Detail | tous | Fiche site + sparklines + composite ring |
| `/collecte` | Collections | admin/sup/agent | Liste collectes (icône statut / site / date / flèche) |
| `/collecte/:id` | Collection Detail | tous | Détail (summary grid → mesures → photos → timeline → versions) |
| `/collecte/validation` | Review | admin/sup | File de validation single-row |
| `/collecte/import` | Import | admin/sup/agent | Upload CSV Kobo |
| `/collecte/:id/resultats-labo` | Lab Results entry | admin/sup | Saisie bordereau côté sup |
| `/labo/echantillons` | Lab Samples | admin/sup | Pipeline labo (4 onglets) |
| `/alertes` | Alerts | admin/sup | Boîte de réception alertes (split list/detail) |
| `/agents` | Agents | admin/sup | Référentiel agents en tableau |
| `/agents/:id` | Agent Detail | admin/sup | Fiche agent + collectes récentes |
| `/cartographie` | Mapping | admin/sup/visitor | Carte Leaflet (à enrichir : heatmaps, évolution temporelle) |
| `/analytics` | Analytics | admin/sup/visitor | Composite rings + comparator multi-sites |
| `/reporting` | Reports | admin/sup/visitor | Rapport mono-site / multi-sites |
| `/admin/utilisateurs` | Users | admin | CRUD users |
| `/admin/roles` | Roles | admin | Matrice RBAC |
| `/admin/indicateurs` | Indicators | admin | Référentiel indicateurs |
| `/admin/referentiels` | RefData | admin | Vocabulaires contrôlés (unités, méthodes, types site, etc.) |
| `/admin/seuils` | Thresholds | admin | NormeRejet |
| `/admin/audit` | Audit | admin | Journal d'audit |

---

## 11. Roadmap par phases

### Phase A — Vocabulaire & référentiels (alignement client, sans casser le frontend)

| # | Tâche | Impact |
|---|---|---|
| A1 | Aligner `Site` sur `SiteTeinture` (codeSite, nombreFemmes/Hommes/Total, niveauFormalisation, responsableNom/Contact, superficie, quartier) | Visible (liste sites, fiches) |
| A2 | Référentiels en BDD : `ParametreAnalyse`, `ParametreUnite`, `NormeRejet` éditables côté admin | Visible (pages admin) |
| A3 | Hiérarchie administrative : `Region`, `Cercle`, `Commune` (fixtures Bamako + Ségou) | Filtres dashboard |
| A4 | Étendre indicateurs : Cr³⁺/Cr⁶⁺ séparés, NO, NO2, CO, SO2, COV, coloration, 12 métaux sol | Visible (mesures) |
| A5 | Distinguer `validMin/Max` (validité physique) vs `minOk/maxOk` (conformité) | Validation ingestion |

### Phase B — Découpage Collecte / Prélèvement / Échantillon / Analyse / Résultat

| # | Tâche | Impact |
|---|---|---|
| B1 | Entité `Prelevement` sur Collection (avec `pointPrelevement`, `prelevePar`, GPS, dates, conditionnement) | Structurel |
| B2 | `Echantillon` devient entité top-level (codeEchantillon, statut, dates labo) | Structurel |
| B3 | `AnalyseLaboratoire` séparée (numeroRapport, fichierRapport PDF, statut) | Lab page |
| B4 | `ResultatAnalyse` = ex-Measurement, lié à AnalyseLaboratoire | Refactor Measurement |
| B5 | `ValidationSuperviseur` **par résultat**, plus par collecte | Revue collecte |
| B6 | Champ `declaredConformity` sur CollecteTerrain (4 valeurs) | Visible (saisie + détail) |

### Phase C — Modules nouveaux

| # | Tâche | Impact |
|---|---|---|
| C1 | Module Recommandations (`/recommandations`, liste + détail + statut + échéance) | Nouveau module |
| C2 | RBAC formel : tables Role + Permission éditables admin | Sécurité |
| C3 | Webhook Kobo `/api/v1/kobo/webhook` (ingestion temps réel) | Backend |
| C4 | Scoring qualité auto (incohérences, GPS hors site, photo manquante, plages physiques) | Qualité données |
| C5 | Détection valeur aberrante vs historique (× 5 pic site) | Alertes intelligentes |

### Phase D — Premium (inputs DIAWARA)

| # | Tâche | Impact |
|---|---|---|
| D1 | Dashboard exécutif : score env (0–100), niveau risque, conformité globale, alertes critiques | Stratégique |
| D2 | Cartographie analytique : heatmaps, niveau pollution, évolution temporelle (slider année) | Visuel fort |
| D3 | Offline-first robuste : queue de sync auto-déclenchée, retry exponentiel, conflit-resolution | Terrain Mali |
| D4 | Audit trail complet : qui a modifié quoi, quand, pourquoi | Traçabilité |

### Phase E — Branchement live API

Quand prêt :
- Substituer MSW par un client HTTP qui pointe sur `http://187.127.225.182/api/`.
- Auth (à confirmer : JWT, OAuth, …).
- Mapping IRI ↔ objets locaux (JSON-LD `@id` resolution).
- Garder MSW activable en dev pour offline.

---

## 12. Conventions de code

### 12.1 Fichiers et nommage
- Composants : `PascalCase.tsx` + `PascalCase.module.css`.
- Hooks : `useXxx.ts`.
- Helpers : `xxxHelpers.ts` ou `xxx.ts`.
- Types : groupés dans `types.ts` du feature ou `api/xxx.types.ts`.
- Imports absolus via `@/` (configuré dans `tsconfig.json` + `vite.config.ts`).

### 12.2 React
- Function components uniquement, hooks.
- Pas de `React.FC` (preference projet).
- Props interface au-dessus du composant.
- `useMemo` / `useCallback` quand vraiment justifié (perf mesurée).

### 12.3 TypeScript strict
- `strict: true` + `noUncheckedIndexedAccess: true`.
- Pas de `any`, exception très rare et justifiée.
- Types côté API alignés sur les schémas backend (voir §3.4).

### 12.4 CSS
- CSS Modules uniquement, pas de styled-components.
- Tokens centralisés (`tokens.css`), pas de couleurs hardcodées.
- Classes utilitaires : éviter, préférer le module.
- Media queries : breakpoints `768px` (mobile) et `1024px` (tablette).

### 12.5 Tests
- Pas de tests dans la maquette (priorité au visuel). Quand le branchement API arrive : tests unitaires sur helpers, tests d'intégration sur les mutations critiques.

### 12.6 Commits
- Messages en français, ton concret (« retire X », « ajoute Y », « fix invalid time »).
- Pas de scope, pas de conventional commits.
- Le **pourquoi** dans le corps, pas le quoi (le diff montre le quoi).

### 12.7 Mocks (MSW)
- 1 handler par ressource backend (`src/mocks/handlers/*.ts`).
- Fixtures dans `src/mocks/fixtures/*.ts`.
- Délais réseaux simulés (`await delay(150–400)`) pour montrer les loaders.

---

## 13. Le checklist pour qu'un nouveau dev démarre

1. Lire ce cahier en entier.
2. Lire les 2 documents client : `docs/DocumentsFournisClient/inputs-DIAWARA_18-05.pdf` et `QST_SahelEnvironnement_MaliCoton_v2.xlsx`.
3. Visiter l'API : `curl http://187.127.225.182/api/docs.jsonopenapi | jq .`
4. Cloner, `pnpm install`, `pnpm dev`.
5. Comptes de démo (mot de passe `demo`) :
   - `admin@pnud.org` → admin
   - `superviseur@sahel.com` → superviseur
   - `agent.bamako@sahel.com` → agent (peut se connecter mais n'a presque rien à faire ; le vrai agent est sur Kobo)
   - `observateur@pnud.org` → visitor
6. Avancer phase par phase (§11). Toujours faire passer `npx tsc --noEmit` et `npx vite build` avant commit.

---

## 14. Décisions tranchées (référence rapide)

| # | Décision | Raison |
|---|---|---|
| 1 | Agent terrain n'a pas de compte plateforme | Réalité terrain Mali, tablette Kobo suffit |
| 2 | Labo n'a pas de compte plateforme | Workflow par e-mail/courrier, pas besoin de provisionner |
| 3 | LNE n'est pas codé en dur, c'est un labo parmi d'autres | Modularité |
| 4 | On garde les anciens noms de sites (ATPEK etc.) en attendant SITE01-06 | Pas de bascule big-bang |
| 5 | Domaines santé/socio/déchets conservés | D'autres sources possibles |
| 6 | Pas de localStorage pour la persistance — tout via MSW handlers | Source de vérité unique |
| 7 | Pas de prose explicative inutile dans l'UI | Pro & soft |
| 8 | Dock flottant pour les actions superviseur | Toujours accessible |
| 9 | Liste plutôt que cards quand on a une collection d'items | Densité |
| 10 | QueryClient agressif sur le refetch | Plus jamais de F5 |
| 11 | Plage de conformité affichée seulement quand la valeur est saisie | Pas d'info prématurée |
| 12 | Kobo v1 masqué, v2+ visible (= ré-soumission après correction) | Signal utile uniquement |
| 13 | Ajout d'un labo à la volée depuis le sup workflow | Rien par magie |
| 14 | PDF bordereau upload via FileReader → data URL embarquée | Maquette sans backend storage |
| 15 | Validation **par résultat** (objectif Phase B5) | Granularité demandée par le backend |

---

## 15. Documents associés

- **`docs/DocumentsFournisClient/inputs-DIAWARA_18-05.pdf`** : feedback sponsor mi-projet (7 axes premium).
- **`docs/DocumentsFournisClient/QST_SahelEnvironnement_MaliCoton_v2.xlsx`** : questionnaire Kobo officiel.
- **OpenAPI backend** : `http://187.127.225.182/api/docs.jsonopenapi` (à dump localement en `docs/openapi-backend.json` quand possible).
- **CDC PNUD** : référence projet PASET Mali Coton (UNDP-MLI-00492).

---

*Document maintenu vivant. Toute décision majeure (modèle, UX, scope) doit être consignée ici en §14 avec sa justification.*
