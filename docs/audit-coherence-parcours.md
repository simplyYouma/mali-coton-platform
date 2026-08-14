# Audit de cohérence des parcours — PASET Mali

**Branche** : `audit/coherence-parcours` (depuis `main`, commit `5218840`)
**Date** : 14 août 2026
**Périmètre** : frontend `mali-coton-platform` — 199 fichiers TS/TSX, 69 CSS Modules,
~49 500 lignes, 30 pages, 20 routes.
**Nature** : diagnostic. **Aucune correction n'a été appliquée.**

---

## 1. Méthode

Trois sources de preuve, dans cet ordre :

1. **Lecture du code** — couche API, hooks, pages, handlers MSW, fixtures.
2. **Exécution mesurée** — l'application a été lancée en mode `mock` sur
   `http://localhost:8492` et parcourue automatiquement (Playwright) sous
   **4 rôles × 27 routes**, en enregistrant pour chaque écran les erreurs
   console, les requêtes réseau en échec et une capture.
3. **Tests d'interaction** — écritures réellement déclenchées (suppression,
   acquittement d'alerte, ajout de champ, soumission de formulaire) avec
   inspection du corps HTTP envoyé et de l'état résultant.

Ce qui suit distingue systématiquement **constaté** (exécuté, mesuré) de
**déduit** (lu dans le code, non exécutable ici).

### Ce que je n'ai pas pu vérifier

- **Le mode `live`.** Le backend `api.back-paset.com` n'est pas accessible depuis
  ce poste. Tout ce qui concerne le comportement en production est déduit de la
  lecture du code et du croisement avec `docs/openapi-backend.json`. C'est
  signalé à chaque fois.
- **Les autorisations réelles du backend.** Le §4.1 démontre que le *frontend*
  n'oppose aucune barrière. Savoir si le *backend* la refuse demande un test
  contre l'API réelle, que je n'ai pas pu faire.
- **Le rôle `lab`.** Aucun compte de démonstration n'est documenté pour ce rôle ;
  il n'a donc pas été parcouru. Les 4 rôles testés sont `admin`, `superviseur`,
  `agent`, `observateur`.

### État de référence, inchangé

| Contrôle | Avant | Après |
|---|---|---|
| `npm run lint` | 64 problèmes (50 err / 14 warn) | 64 — aucune modification de `src/` |
| Fichiers modifiés | — | 1 ajout : ce document |

---

## 2. Synthèse

Le projet n'est pas incohérent par négligence : il est **cohérent par morceaux**,
et les morceaux ne se rejoignent pas. Le fil conducteur de tous les constats qui
suivent est le même :

> **Chaque contributeur a construit une chaîne complète et correcte pour son
> domaine, en dupliquant les concepts des chaînes voisines plutôt qu'en s'y
> raccordant. Et l'application ne dit jamais quand une de ces chaînes est
> rompue : elle affiche « vide ».**

Cinq constats structurants :

| # | Constat | Gravité | Statut |
|---|---|---|---|
| A | **26 pages sur 30 n'interrogent jamais `isError`** : toute panne réseau s'affiche comme un écran vide, jamais comme une erreur | Élevée | Constaté |
| B | **6 routes d'administration n'ont aucun `RoleGuard`** : un observateur en lecture seule déclenche réellement un `DELETE` de modèle de formulaire | Élevée | Constaté |
| C | **Trois systèmes parallèles de « collecte »** cohabitent sans jonction : `collecte_sites` (Kobo), `collections` (campagnes), `soumissions` (formulaires) | Élevée | Constaté |
| D | **Aucune alerte n'est créée nulle part dans le code** : les 14 alertes sont des fixtures écrites à la main, et la liste est vide en `live` | Élevée | Constaté / déduit |
| E | **Deux implémentations concurrentes** pour laboratoire, seuils et indicateurs — l'une câblée sur `mock`, l'autre sur `live`, aucune ne marche dans les deux | Moyenne | Constaté |

L'UI/UX, elle, est **plus maîtrisée que ne le suggère l'impression générale** :
92,6 % des couleurs passent par les tokens. Les écarts réels sont ailleurs —
voir §6.

---

## 3. Vos questions, dans l'ordre

### 3.1 « Des données de collecte apparaissent dans la fiche Site alors qu'on a une page Collectes dédiée. Qui affiche quoi, et pourquoi ? »

**Ce ne sont pas les mêmes données.** Trois entités distinctes portent le nom de
« collecte » dans ce dépôt :

| Entité | Ce que c'est | Où c'est affiché | Hook |
|---|---|---|---|
| `collecte_sites` | **Fiche terrain Kobo** : une visite d'enquête, avec effectifs, EPI, risques, formations, besoins | **Fiche Site** — onglets *Profil*, *Conditions de travail*, *Appuis & Besoins* | `useSiteDetail` |
| `collections` | **Campagne de mesure** : indicateurs physico-chimiques, prélèvements labo, workflow de validation | **Page Collectes** `/collecte` | `useCollections` |
| `soumissions` | **Saisie via formulaire dynamique** créé par l'admin | **Page Soumissions** `/formulaires/soumissions` | `useSoumissions` |

La fiche Site n'appelle **jamais** `useCollections` — vérifié : ses seuls appels
sont `useSite`, `useSiteDetail`, `useSiteEmployes`
([SiteDetailPage.tsx:294-301](../src/features/sites/pages/SiteDetailPage.tsx#L294-L301)).
Les données de collecte qu'on y voit viennent de `detail.collecteSite`
([SiteDetailPage.tsx:313](../src/features/sites/pages/SiteDetailPage.tsx#L313)),
c'est-à-dire de la **fiche terrain Kobo**, servie sur la même URL que le site
lui-même (`GET /sites/:id`).

**Ce n'est donc pas un doublon d'affichage — c'est un doublon de vocabulaire.**
Le mot « collecte » désigne trois choses, et rien dans l'interface ne le dit.
Un superviseur qui lit « dernière collecte » sur la fiche Site et va vérifier
dans *Collectes* ne trouvera pas la même chose, et aura raison de s'inquiéter.

**Ce qui est réellement cassé, en revanche** : les trois systèmes ne communiquent
pas. Une soumission de formulaire n'apparaît ni dans *Collectes*, ni sur la fiche
Site, ni dans le tableau de bord. Le seul recoupement observé est `siteTeinture`,
un identifiant de site — et il est **affiché brut** :

> `SoumissionsListPage.tsx:141` rend `…/${s.siteTeinture.split('/').pop()}`,
> ce qui produit littéralement `…/1`, `…/2`, `…/site-atpek` dans la colonne
> *Site*. La page ne charge jamais la liste des sites, elle n'a donc aucun moyen
> de résoudre le nom.
> — *Constaté* (capture `soumissions-in-app.png`).

### 3.2 « Les alertes : d'où viennent-elles, qu'est-ce qui les déclenche, où atterrissent-elles ? »

**D'où elles viennent** : d'un seul endroit, `src/mocks/fixtures/alerts.ts` —
14 alertes écrites à la main. Recherche exhaustive de toute construction d'un
objet `AlertEntry` dans `src/` : **aucune occurrence hors des fixtures et des
deux handlers de changement de statut.**

**Ce qui les déclenche** : rien. Aucun code n'évalue une mesure contre un seuil
pour produire une alerte. Ce qui existe :

- `alerts/lib/actionRules.ts` (14 règles, 240 lignes) — ne *déclenche* rien.
  Il **rédige le texte** de l'action recommandée d'une alerte **déjà existante**.
- `alerts/lib/alertSummary.ts` — met en forme un résumé, même principe.
- `collection/lib/indicatorRules.ts` — **le vrai moteur de conformité**, utilisé
  par 11 fichiers (dashboard, analytics, reporting, validation). Il calcule bien
  `conforming | warning | critical` à partir des mesures.
  **Il ne produit jamais d'alerte.**

Autrement dit : la plateforme sait dire qu'une mesure est critique dans le
tableau de bord, et sait rédiger l'action à mener pour une alerte critique — mais
rien ne relie les deux. Ce sont **deux vérités indépendantes**, qui peuvent
diverger sans que rien ne le signale.

**Où elles atterrissent** : 5 consommateurs — `AppLayout` (badge sidebar),
`AlertsPage`, `DashboardPage`, `MappingPage`, `ReportingPage`.

**En production, il n'y en a aucune.** [`alerts.ts:12`](../src/features/alerts/api/alerts.ts#L12) :

```ts
if (API_MODE === 'live') {
  return Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 });
}
```

La page Alertes, le badge de la sidebar, la carte et le rapport PDF affichent
donc **zéro alerte** sur `paset-mali.com`, sans le moindre message. *(Déduit de
la lecture ; non exécutable sans backend.)*

**Un défaut vérifié dans la chaîne d'acquittement.** Les deux seules mutations
d'alerte encodent leur corps deux fois :
[`alerts.ts:27`](../src/features/alerts/api/alerts.ts#L27) et
[`:34`](../src/features/alerts/api/alerts.ts#L34) passent
`body: JSON.stringify(input)`, alors que `http()` sérialise déjà
([`http.ts:63`](../src/lib/http.ts#L63)). Les 40 autres appels du dépôt passent
l'objet nu.

Corps réellement envoyé, capturé au runtime :

```
--> POST /api/v1/alerts/alert-014/acknowledge
    CORPS BRUT ENVOYE: "{\"acknowledgedBy\":\"u-admin-1\"}"
```

Le serveur reçoit une *chaîne* de caractères, pas un objet. `acknowledgedBy` est
donc perdu. Effet visible dans l'interface — la chronologie affiche l'événement
**sans le nom de la personne** :

```
HISTORIQUE | Alerte levée | 14 août 12:56 | Prise en compte | 14 août 13:21
```

alors que [`AlertsPage.tsx:464`](../src/features/alerts/pages/AlertsPage.tsx#L464)
prévoit d'afficher `· <nom>`. **La traçabilité de qui a pris en charge une alerte
est perdue.** — *Constaté.*

### 3.3 « Toutes les pages : quelle est la logique de chacune, à quoi elle se relie, et est-ce que c'est cohérent ? »

Voir l'inventaire complet en **annexe A**. Les incohérences structurelles :

**a) La navigation filtre par rôle, les routes non.** Sur 20 routes, **6 ne sont
protégées par aucun `RoleGuard`** alors que le menu les réserve à certains rôles.
Résultat mesuré (19 combinaisons rôle × route atteintes hors menu) :

| Rôle | Atteint sans y avoir droit selon le menu |
|---|---|
| `agent` | `/sites`, `/collecte`, `/alertes`, `/cartographie`, `/analytics`, `/reporting`, **`/admin/formulaires`**, **`/admin/formulaires/nouveau`**, **`/admin/formulaires/:id/champs`** |
| `observateur` (lecture seule) | `/collecte`, `/alertes`, `/formulaires`, `/formulaires/soumissions`, **`/admin/formulaires`** + les 2 autres routes admin |
| `superviseur` | les 3 routes `/admin/formulaires*` |

`/admin/formulaires` est **la seule route `/admin/*` non gardée** — les six autres
le sont. C'est un oubli isolé, pas une politique.

**b) Deux implémentations concurrentes du même domaine.** Trois fois :

| Domaine | Implémentation A | Implémentation B |
|---|---|---|
| Laboratoire | `collection` — cycle de vie des échantillons (`markSampleSent`, `transmitBordereau`…), handlers MSW présents | `lab` — `/labo/{echantillons,prelevements,analyses}`, **`return []` si non-`live`** |
| Seuils | `thresholds` — servi par MSW, hooks `useThresholds`/`useUpdateThreshold` | `seuil_normatifs` — onglet *Seuils* de Référentiels, **`live` uniquement** |
| Indicateurs | `fetchIndicatorsAdmin` (admin.ts) | `fetchIndicateurs` (referentiels.ts) |

Conséquence mesurée : **19 hooks exportés n'ont aucun consommateur**, dont tout
le cycle de vie des échantillons (`useMarkSampleSent`, `useMarkSampleReceived`,
`useRefuseSample`, `useTransmitBordereau`, `useRejectBordereau`,
`useRequestCorrection`) et toute la gestion des seuils.

*Note d'exactitude* : `IndicatorsPage` **n'est pas** une page morte — elle est
correctement réutilisée comme onglet embarqué de `RefDataPage`
([RefDataPage.tsx:184](../src/features/admin/pages/RefDataPage.tsx#L184)). Bon
exemple de réemploi.

**c) Des sections entières vides en mode démonstration.** Le mode `mock` est
celui que toute l'équipe utilise. Y sont structurellement vides :

| Page | Pourquoi | Ce que voit l'utilisateur |
|---|---|---|
| `/labo/analyses`, `/labo/prelevements`, `/labo/echantillons` | `laboratoire.ts` : `if (API_MODE !== 'live') return {items: []}` **et** handlers MSW « volontairement vide » | « Aucun résultat d'analyse » sous un en-tête qui annonce « 21 paramètres consolidés » |
| `/admin/referentiels` (5 onglets) | `referentiels.ts` : 7 fonctions `if (API_MODE !== 'live') return []` | « Aucun paramètre trouvé — **ajustez les filtres** ou créez un nouveau paramètre » |

Le message de Référentiels **impute le vide à l'utilisateur** (« ajustez les
filtres ») alors que la cause est un court-circuit dans le code. C'est aussi la
page qui porte les seuils normatifs — ceux-là mêmes qui devraient déclencher les
alertes du §3.2. — *Constaté, captures à l'appui.*

**d) Deux vues du même formulaire qui se contredisent.** Le cas le plus net de
l'audit :

- L'agent ouvre `/formulaires/1/saisir` → **9 champs s'affichent et se
  remplissent** (via `useFormulaire` → `GET /formulaires/1`, qui embarque `champs`).
- L'admin ouvre `/admin/formulaires/1/champs` pour les gérer → **« Aucun champ.
  Commencez par en ajouter un. »** (via `useChamps` → `GET /champ_formulaires`,
  **404**).

La liste admin affiche pourtant « 9 » dans la colonne du nombre de champs, sur la
ligne juste avant. L'admin est donc invité à recréer 9 champs qui existent.

Et s'il accepte l'invitation :

```
--> POST /api/v1/champ_formulaires
<-- 404
```

**Aucun message. La fenêtre reste ouverte, les valeurs saisies en place, rien ne
se passe.** — *Constaté.*

### 3.4 « L'UI/UX est-elle maîtrisée ou est-ce que chacun a fait à sa façon ? »

**Plus maîtrisée qu'il n'y paraît, sur les fondamentaux.**

| Mesure | Résultat |
|---|---|
| Tokens de design définis | 137 |
| Usages de `var(--…)` dans les CSS Modules | **4 648** |
| Couleurs écrites en dur | **371** (7,4 %) |
| Fichiers CSS sans aucune couleur en dur | 30 / 69 |
| Pages avec squelette de chargement | **28 / 30** |
| Pages avec état vide | 20 / 30 |

Ce n'est pas le profil d'un projet où chacun a fait à sa façon. Les concentrations
de valeurs en dur sont localisées et souvent justifiées :
`ReportPreview.module.css` (91 — rendu PDF, hors thème), `Sidebar` (31),
`RefDataPage` (26), `SiteDetailPage` (22).

**Les écarts réels sont ailleurs, et ils sont de trois ordres.**

**1. Deux motifs d'en-tête concurrents.** Un composant partagé `PageHeader` existe
dans la bibliothèque commune. **2 pages sur 30 l'utilisent** (`SitesListPage`,
`LabResultsPage`). Les 26 autres réimplémentent un bloc `hero` en CSS local. Le
composant partagé est de fait abandonné sans avoir été retiré.

**2. Deux mécanismes de confirmation pour la même action destructrice.** Le projet
fournit un `ConfirmProvider` rendant une `Modal` du design system. Il est utilisé
par 6 actions. Mais **4 suppressions passent par le `confirm()` natif du
navigateur** — boîte grise du système d'exploitation, hors charte :

- [`FormulaireAdminListPage.tsx:82`](../src/features/formulaires/pages/FormulaireAdminListPage.tsx#L82)
- [`ChampListPage.tsx:167`](../src/features/formulaires/pages/ChampListPage.tsx#L167)
- [`RefDataPage.tsx:282`](../src/features/admin/pages/RefDataPage.tsx#L282) et [`:928`](../src/features/admin/pages/RefDataPage.tsx#L928)

Supprimer un utilisateur ouvre une modale PNUD ; supprimer un formulaire ouvre une
boîte Windows. Même geste, deux interfaces.

**3. Le défaut d'ergonomie le plus coûteux : l'échec silencieux.** **26 pages sur
30 ne lisent jamais `isError`** — seules `LoginPage`, `CollectionImportPage`,
`FormulaireCollectePage` et `SiteDetailPage` le font. Partout ailleurs le motif
est :

```ts
const { data, isLoading } = useQuery(...)
const items = data?.items ?? []      // une erreur devient une liste vide
```

C'est la cause commune de presque tous les constats précédents. Un 404 ne dit pas
« c'est cassé » : il dit « il n'y a rien ». L'utilisateur en conclut que la donnée
n'existe pas, et agit en conséquence — en recréant 9 champs, ou en signalant que
« les analyses ont disparu ».

**Accessibilité** — 15 pages construisent leur propre `<table>` (aucun composant
partagé n'existe pour cela), et les 50 erreurs de lint sont majoritairement des
`jsx-a11y` sur les visionneuses de photos (`SitePhotoLightbox`, `PhotoLightbox`) :
éléments non interactifs porteurs de `onClick`, sans gestion clavier.

---

## 4. Inventaire par gravité

### 4.1 — Élevée · Routes d'administration ouvertes à tous les rôles

**Constaté.** Six routes sans `RoleGuard` ; en particulier les trois
`/admin/formulaires*`, seules routes `/admin/*` non protégées.

Test exécuté — observateur **et** agent, sur `/admin/formulaires` :

```
boîte de confirmation : « Supprimer le formulaire "Fiche de visite initiale" ?
                          Cette action est irréversible. »
--> DELETE /api/v1/formulaires/1
<-- 404
message à l'écran : aucun
```

La requête de suppression **part réellement**. Elle n'échoue que parce que MSW
n'implémente pas ce verbe — **pas** parce qu'un contrôle l'a refusée. Le DOM
confirme que les 4 boutons d'écriture de chaque ligne (*Gérer les champs*,
*Éditer*, *Désactiver*, *Supprimer*) sont rendus avec `disabled: false` pour un
rôle en lecture seule, ainsi que le bouton *Nouveau formulaire*.

**Non vérifié** : ce que fait le backend réel face à ce `DELETE`. La protection
repose aujourd'hui entièrement sur lui.

*Fichiers* : [`routes.tsx:142-149`](../src/app/routes.tsx#L142-L149)

### 4.2 — Élevée · L'échec réseau est indiscernable de l'absence de donnée

**Constaté.** 26 pages sur 30 ignorent `isError`. Manifestations vérifiées :
`/admin/formulaires/:id/champs` (404 → « Aucun champ »), création de champ
(404 → rien), suppression de formulaire (404 → rien).

### 4.3 — Élevée · Aucun mécanisme ne crée d'alerte

**Constaté** (mock) / **déduit** (live). Voir §3.2. En `live`, `fetchAlerts`
retourne une liste vide inconditionnellement.

### 4.4 — Élevée · Le gestionnaire de champs de formulaire est inopérant en `mock`

**Constaté.** MSW ne sert que `GET /formulaires`, `GET /formulaires/:id`,
`GET|POST /soumissions`, `GET /soumissions/:id`. Ne sont servis nulle part :

| Appelé par le client | Servi par MSW |
|---|---|
| `POST /formulaires` (créer) | non |
| `PATCH /formulaires/:id` (éditer, publier, archiver) | non |
| `DELETE /formulaires/:id` | non |
| `GET`/`POST`/`PATCH`/`DELETE` `/champ_formulaires` | non |

Toute la construction de formulaires est donc morte dans le mode que l'équipe
utilise pour les démonstrations — et morte **silencieusement**.

### 4.5 — Moyenne · Perte de traçabilité sur l'acquittement d'alerte

**Constaté.** Double encodage JSON, voir §3.2. Corrigeable en supprimant deux
`JSON.stringify`.

### 4.6 — Moyenne · Sections vides sans explication en mode démonstration

**Constaté.** 3 pages `/labo/*` + les 5 onglets de `/admin/referentiels`. Le
message d'état vide de Référentiels attribue la cause à l'utilisateur.

### 4.7 — Moyenne · Identifiants techniques exposés à l'utilisateur

**Constaté.** Colonne *Site* de `/formulaires/soumissions` : `…/1`, `…/2`,
`…/site-atpek`. [`SoumissionsListPage.tsx:141`](../src/features/formulaires/pages/SoumissionsListPage.tsx#L141)

### 4.8 — Moyenne · Deux mécanismes de confirmation destructrice

**Constaté.** Voir §3.4, point 2.

### 4.9 — Faible · Motif d'en-tête dédoublé

**Constaté.** `PageHeader` utilisé par 2 pages sur 30.

### 4.10 — Faible · Vocabulaire « collecte » ambigu et libellés flottants

**Constaté.** Trois entités nommées « collecte » (§3.1). Sur la page Alertes, le
même événement s'appelle « Alerte levée » dans la chronologie et « Soulevée le »
dans l'export XLSX — et « levée » se lit aussi bien comme *déclenchée* que comme
*clôturée*.

### 4.11 — Faible · Code non atteint

**Constaté.** 19 hooks exportés sans consommateur ; handlers MSW `parametre_unites`
jamais appelés (le client court-circuite avant).

---

## Annexe A — Carte des flux par page

Légende : **M** = fonctionne en mock · **L** = fonctionne en live (déduit) ·
**∅** = vide par construction

| Page | Route | Garde | Source | M | L |
|---|---|---|---|---|---|
| DashboardPage | `/dashboard` | oui | `collections` + `sites` + `alerts` | ✔ | ✔ |
| SitesListPage | `/sites` | **non** | `sites` | ✔ | ✔ |
| SiteDetailPage | `/sites/:id` | **non** | `sites/:id` (+ `collecteSite` Kobo), `…/employes` | ✔ | ✔ |
| CollectionsListPage | `/collecte` | **non** | `collections` | ✔ | ✔ |
| CollectionsReviewPage | `/collecte/validation` | oui | `collections` | ✔ | ✔ |
| CollectionImportPage | `/collecte/import` | oui | `kobo/import` | ✔ | ✔ |
| CollectionDetailPage | `/collecte/:id` | **non** | `collections/:id` | ✔ | ✔ |
| LabResultsPage | `/collecte/:id/resultats-labo` | oui | `collections/:id`, `labs` | ✔ | ✔ |
| LabSamplesPage | `/labo/echantillons` | oui | `echantillons` | **∅** | ✔ |
| PrelevementsPage | `/labo/prelevements` | oui | `prelevements` | **∅** | ✔ |
| AnalysesPage | `/labo/analyses` | oui | `resultat_analyses` | **∅** | ✔ |
| AlertsPage | `/alertes` | **non** | `alerts` (fixtures) | ✔ | **∅** |
| RecommandationsPage | `/recommandations` | oui | `recommandations` | ✔ | ✔ |
| TeamListPage | `/agents` | oui | `users`, `collections` | ✔ | ✔ |
| AgentDetailPage | `/agents/:id` | oui | `users`, `collections` | ✔ | ✔ |
| FormulaireListPage | `/formulaires` | **non** | `formulaires` | ✔ | ✔ |
| SoumissionsListPage | `/formulaires/soumissions` | **non** | `soumissions` | ✔ | ✔ |
| FormulaireCollectePage | `/formulaires/:id/saisir` | **non** | `formulaires/:id`, `sites` | ✔ | ✔ |
| FormulaireAdminListPage | `/admin/formulaires` | **non** | `formulaires` (lecture ✔, écriture ✘) | partiel | ✔ |
| FormulaireFormPage | `/admin/formulaires/nouveau` | **non** | `POST/PATCH formulaires` | **✘** | ✔ |
| ChampListPage | `/admin/formulaires/:id/champs` | **non** | `champ_formulaires` | **✘ 404** | ✔ |
| MappingPage | `/cartographie` | **non** | `sites`, `collections`, `alerts` | ✔ | partiel |
| AnalyticsPage | `/analytics` | **non** | `collections`, `sites` | ✔ | ✔ |
| ReportingPage | `/reporting` | **non** | `collections`, `sites`, `alerts` | ✔ | partiel |
| UsersPage | `/admin/utilisateurs` | oui | `users`, `roles` | ✔ | ✔ |
| RolesPage | `/admin/roles` | oui | `roles`, `permissions` | ✔ | ✔ |
| RefDataPage | `/admin/referentiels` | oui | `parametre_analyses`, `seuil_normatifs`… | **∅** | ✔ |
| AuditLogsPage | `/admin/audit` | oui | `audit-logs` | ✔ | **∅** |

## Annexe B — Preuves d'exécution

Parcours automatisé : 4 rôles × 27 routes = 108 écrans, captures et journal
réseau. Seules erreurs console relevées : le 404 `champ_formulaires`, sur les
4 rôles.

Tests d'écriture exécutés :

| Test | Résultat |
|---|---|
| Observateur → supprimer un formulaire | `DELETE` émis, 404, aucun message |
| Agent → supprimer un formulaire | identique |
| Admin → ajouter un champ | `POST` 404, modale figée, aucun message |
| Admin → acquitter une alerte | 200, corps double-encodé, auteur perdu |
| Agent → soumettre une fiche (9 champs) | 201, apparaît bien dans *Soumissions* |

*Note de méthode* : un premier test avait conclu à tort que la soumission
n'apparaissait nulle part. En réalité la navigation par rechargement complet
réinitialise le magasin MSW — comportement documenté dans le README. Le test
refait en navigation interne montre que **la soumission remonte correctement**
dans `/formulaires/soumissions`.
