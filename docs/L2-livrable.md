# Livrable L2 — Maquette interactive validée

**Projet** : Renforcement de la Durabilité du Secteur Textile au Mali — *UNDP-MLI-00492*
**Maître d'ouvrage** : PNUD Mali
**Cabinet retenu** : Consortium Sahel Analytics (Lead) × Sahel Environnement
**Date de remise** : Avril 2026
**Référence CDC** : §6.2 — Livrables et critères d'acceptation

---

## 1. Objet

Le Livrable L2 matérialise la **maquette interactive** de la Plateforme Numérique de Suivi Socio-Environnemental des Teintureries (Mali Coton). Cette maquette couvre l'intégralité des parcours métier des trois profils utilisateurs et donne à voir les fonctionnalités MVP (Phase 1) ainsi que les aperçus des modules avancés (Phase 2), conformément au cahier des charges.

Le code livré n'est pas un mock visuel jetable : c'est un **template UI/UX directement raccordable à un backend** via le contrat d'API documenté ([tech-spec.md §5](tech-spec.md)). Les types TypeScript stricts et les hooks de mutation/query servent de spécification exécutable.

---

## 2. Conformité aux critères L2 (CDC §6.2)

| Critère CDC | État | Référence |
|---|---|---|
| Maquette interactive navigable | ✅ Livré | Tout le code `src/` |
| Parcours complet — Agent terrain | ✅ Livré | §3.1 ci-dessous |
| Parcours complet — Superviseur | ✅ Livré | §3.2 ci-dessous |
| Parcours complet — Administrateur PNUD | ✅ Livré | §3.3 ci-dessous |
| Modules MVP Phase 1 | ✅ 4/4 | §4 ci-dessous |
| Aperçus Phase 2 | ✅ 4/4 | §5 ci-dessous |
| Application tablette offline | ✅ Livré | Dexie + outbox `src/features/collection/lib/` |
| Bilingue FR / BM | ✅ FR complet · BM amorcé | `src/i18n/` |
| RBAC 3 profils | ✅ Livré | `RoleGuard` + nav filtrée |
| Sources normatives affichées | ✅ Livré | `ThresholdIndicator`, AuditLogs, Reporting |
| Rapport de tests utilisateurs | ✅ Livré | [L2-rapport-tests-utilisateurs.md](L2-rapport-tests-utilisateurs.md) |
| Design system documenté | ✅ Livré | [design-system.md](design-system.md) |
| Spécification technique | ✅ Livré | [tech-spec.md](tech-spec.md) |

---

## 3. Parcours utilisateurs

### 3.1 Agent terrain
Connexion → Liste « Mes collectes » → Nouvelle collecte (wizard 6 étapes) → Saisie GPS + photos → Persistence IndexedDB → Mode hors-ligne simulé → Synchronisation automatique → Liste mise à jour.

**Routes clés** : `/login`, `/collecte`, `/collecte/nouveau`, `/collecte/:id`.

### 3.2 Superviseur
Connexion → Tableau de bord (KPI, donut conformité, charts pH/PM2.5, heatmap) → File de validation → Sélection collecte → Revue mesures + photos → Action **Valider** (avec note) ou **Rejeter** (motif obligatoire) → Toast confirmation.

**Routes clés** : `/dashboard`, `/collecte/validation`, `/sites`, `/alertes`, `/cartographie`, `/analytics`, `/reporting`.

### 3.3 Administrateur PNUD
Connexion → Tableau de bord → Création utilisateur (rôle + sites assignés) → Édition seuils par indicateur (avec source normative) → Consultation Journal d'audit (filtres action/ressource/période).

**Routes clés** : `/admin/utilisateurs`, `/admin/seuils`, `/admin/audit`.

---

## 4. Modules MVP Phase 1

### 4.1 Module 1 — Gestion des sites (CDC §5.2.1)
- Liste avec carte split view, filtres commune/type/conformité
- Détail : header GPS, KPIs, timeline d'historique
- Site **NDOMO** marqué Référence (★)
- Formulaire création/édition (admin)

### 4.2 Module 2 — Collecte terrain (CDC §5.2.2)
- Schema IndexedDB (collections, indicators_cache, outbox, drafts)
- Outbox avec rejeu sur reconnexion
- Wizard 6 étapes avec validations Zod par étape, autosave 500 ms
- GPS via `navigator.geolocation`, accuracy affichée
- Capture photo `capture="environment"` + horodatage
- File de synchro affichée dans topbar avec compteur
- Toggle « Mode hors-ligne » dans topbar pour scénarios démo
- Modèle hybride : mesures **in situ** + prélèvements **labo différé** (statuts `awaiting_lab` / `lab_complete`)

### 4.3 Module 2 (suite) — Vue superviseur (CDC §5.2.2)
- Page `/collecte/validation` avec split view : liste à gauche, panneau de revue à droite
- Synthèse 4 cellules (mesures / in situ / bordereaux / photos) + aperçu mesures avec badge conformité
- Actions Valider (note optionnelle) / Rejeter (motif obligatoire) avec toasts
- Lien vers détail complet

### 4.4 Module 3 — Tableaux de bord (CDC §5.2.3)
- Hero card navy en dégradé avec eyebrow live
- Donut conformité globale (UN blue plein) + légende
- Strip 6 KPIs avec icônes colorisées + trend arrows
- LineChart pH par site avec seuil OMS
- BarChart PM2.5 par site avec couleurs dynamiques selon dépassement
- Heatmap conformité sites × domaines
- Widget bordereaux labo en attente

### 4.5 Module 4 — Sécurité & administration (CDC §5.2.4)
- **Utilisateurs** : DataTable avec avatars, rôles colorés, sites assignés (chips), CRUD complet
- **Seuils** : édition par indicateur groupée par domaine, source normative éditable, état "À jour" / "Enregistrer" piloté par dirty-check
- **Audit logs** : DataTable filtrable (action, ressource, période) avec contexte IP/UA

---

## 5. Aperçus Phase 2

### 5.1 Cartographie interactive (CDC §5.2.5)
- Carte plein écran Leaflet + tiles OpenStreetMap
- Markers custom colorés par niveau de conformité
- Popups avec lien vers fiche site
- Panneau de couches (eaux/sol/air/santé/déchets) — toggles désactivés avec mention « Phase 2 : OGC WMS/WFS »

### 5.2 Analytics avancés (CDC §5.2.6)
- Trend explorer : indicateur sélectionnable + période, line chart par site avec seuil
- Indice composite environnement-social (carte navy, score /100, breakdown 60/40)
- Comparateur multi-sites par indicateur, barres horizontales colorées par niveau de dépassement

### 5.3 Reporting automatisé (CDC §5.2.7)
- 3 templates (Bilan mensuel / Trimestriel / Rapport annuel PNUD) avec sections, audience, pages
- Modal de génération avec aperçu "feuille" + barre de progression animée
- Liste rapports récents avec badges format (PDF/XLSX) et téléchargement

### 5.4 Système d'alertes (CDC §5.2.8)
- Liste filtrable (sévérité, statut, catégorie) avec barre de sévérité colorée
- Split view détail : valeur mesurée vs seuil, source normative, action recommandée
- Actions superviseur : Prendre en compte / Marquer résolue

---

## 6. Architecture & qualité

### Stack
React 18 · TypeScript strict · Vite · React Router v6 · TanStack Query · Zustand · React Hook Form + Zod · Chart.js · Leaflet · i18next · MSW · Dexie · Vitest · Playwright.

### Layering
**Domain** (types) → **Application** (hooks/use-cases) → **Infrastructure** (api MSW / Dexie) → **Interface** (composants/pages). Aucune fuite inverse.

### Design system
- **Tokens centralisés** : `src/styles/tokens.css` (couleurs UN blue + Sahel navy + sable, typo Inter, espacements 8 px, shadows subtiles, motion).
- **Composants 100 % custom** (Yumi Standard §22) : aucun `<select>`, `<input type="checkbox">` natif. Focus rings UN blue partout.
- **WCAG 2.1 AA** : labels, `aria-*`, navigation clavier, contrastes vérifiés.

### Backend-ready
Tous les endpoints sont mockés via MSW à `src/mocks/handlers/` et reflètent les contrats `tech-spec.md §5.2`. Bascule serveur réel = changement de baseURL et désactivation MSW. **Aucun refactor de l'interface n'est nécessaire**.

---

## 7. Hors scope L2 (volontaire)

Conformément au plan d'implémentation, sont **explicitement hors scope** du livrable L2 :
- ETL réel et persistance serveur (équipe back-end Phase 1.5)
- Génération PDF/Excel réelle (compositeur serveur Phase 2)
- Couches OGC WMS/WFS réelles (Phase 2)
- Audit de sécurité applicative et tests de pénétration (Phase pré-production)
- Déploiement Docker / CI-CD (DevOps Phase 1.5)

---

## 8. Pour valider la maquette devant le client

L'environnement de démo permet la **saisie réelle** sur tous les modules — les données sont persistées en mémoire MSW pendant la session et la rafraîchissent via React Query. Les brouillons de collecte persistent en IndexedDB entre rechargements.

**Scénarios à dérouler** : voir [L2-rapport-tests-utilisateurs.md](L2-rapport-tests-utilisateurs.md) §3.

---

## 9. Annexes

- [Design System complet](design-system.md)
- [Spécification technique frontend](tech-spec.md)
- [Plan d'implémentation L2](superpowers/plans/2026-04-25-maquette-l2.md)
- [Rapport de tests utilisateurs](L2-rapport-tests-utilisateurs.md)
