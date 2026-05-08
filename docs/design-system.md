# Design System — Plateforme Mali Coton (PNUD)

> Document de référence UI/UX du projet `UNDP-MLI-00492`.
> Version : 1.0 — Auteur : Fatoumata Youma Sokona (UI/UX Lead).
> Aligné sur les exigences du Cahier des Charges v2 (Livrable L2) et le standard *AI Vibe Coding — Yumi Standard*.

---

## 1. Principes directeurs

| Principe | Application concrète |
|---|---|
| **Sobriété élite** | Aucune saturation visuelle. Espaces blancs généreux. Zéro effet flashy, zéro emoji. |
| **Lisibilité terrain** | Contrastes élevés, tailles généreuses, cibles tactiles ≥ 44 px (usage extérieur tablette). |
| **Bilingue** | Tous les libellés sont des clés `i18n` (FR par défaut, BM = Bambara). Pas de texte codé en dur. |
| **Accessibilité** | WCAG 2.1 AA minimum : contraste ≥ 4.5:1, focus visible custom, navigation clavier complète. |
| **Identité culturelle** | Référence subtile aux teintures du Mali (palette indigo + rouille) sans folklore. |
| **Backend-ready** | Chaque composant attend des données via props typées ; aucune logique métier dans l'UI. |

---

## 2. Tokens — Couleurs

Toutes les couleurs sont définies en **CSS variables** dans `src/styles/tokens.css`. **Aucune couleur en dur** dans les composants.

### 2.1 Palette neutre (base)

| Token | Valeur | Usage |
|---|---|---|
| `--color-bg` | `#F7F4EE` | Fond principal — beige coton |
| `--color-surface` | `#FFFFFF` | Cartes, panneaux, modales |
| `--color-surface-2` | `#FBF8F2` | Surfaces secondaires (rows alternées) |
| `--color-border` | `#E8E2D6` | Bordures hairline |
| `--color-border-strong` | `#CFC6B4` | Séparateurs marqués |
| `--color-text` | `#1C1A17` | Texte principal |
| `--color-text-muted` | `#6B6558` | Texte secondaire, métadonnées |
| `--color-text-disabled` | `#A8A192` | États désactivés |

### 2.2 Couleurs de marque

| Token | Valeur | Usage |
|---|---|---|
| `--color-brand-rust` | `#B5471B` | Couleur primaire — boutons, liens actifs (rappel teinture GALA) |
| `--color-brand-rust-hover` | `#9A3B14` | Hover état primaire |
| `--color-brand-indigo` | `#2B3A67` | Couleur secondaire — headers, navigation (rappel INDIGO) |
| `--color-brand-indigo-soft` | `#E6EAF3` | Fond subtil indigo |

### 2.3 Couleurs sémantiques (alertes & conformité)

Alignées sur le système **vert/orange/rouge** prescrit Section 5.2 Module 3 du CDC.

| Token | Valeur | Usage |
|---|---|---|
| `--color-success` | `#2F7D4F` | Conforme aux normes OMS/maliennes |
| `--color-success-bg` | `#E8F2EC` | Badge fond conforme |
| `--color-warning` | `#C77A0E` | Approche du seuil |
| `--color-warning-bg` | `#FBF1DC` | Badge fond avertissement |
| `--color-danger` | `#B02A37` | Dépassement de seuil — alerte critique |
| `--color-danger-bg` | `#F8E5E7` | Badge fond critique |
| `--color-info` | `#2B6CB0` | Information neutre |
| `--color-info-bg` | `#E6EFF8` | Badge fond info |

### 2.4 Couleurs de visualisation (charts)

Palette qualitative 6 teintes, distinguables par daltoniens.

| Token | Valeur | Usage |
|---|---|---|
| `--chart-1` | `#B5471B` | Série 1 (rouille) |
| `--chart-2` | `#2B3A67` | Série 2 (indigo) |
| `--chart-3` | `#7A8C5E` | Série 3 (vert sauge) |
| `--chart-4` | `#C77A0E` | Série 4 (ocre) |
| `--chart-5` | `#5E7A8C` | Série 5 (bleu acier) |
| `--chart-6` | `#8B6F47` | Série 6 (terre) |

---

## 3. Typographie

| Token | Famille | Usage |
|---|---|---|
| `--font-display` | `"Fraunces", Georgia, serif` | H1, H2, chiffres clés KPI |
| `--font-sans` | `"Inter", system-ui, sans-serif` | Corps de texte, UI |
| `--font-mono` | `"JetBrains Mono", monospace` | Coordonnées GPS, IDs, codes |

### Échelle typographique

| Token | Taille | Line-height | Poids | Usage |
|---|---|---|---|---|
| `--text-display` | 40px | 1.1 | 500 | Titres de page principaux |
| `--text-h1` | 28px | 1.2 | 600 | Section principale |
| `--text-h2` | 22px | 1.3 | 600 | Sous-sections |
| `--text-h3` | 18px | 1.4 | 600 | Cartes, blocs |
| `--text-body` | 14px | 1.5 | 400 | Texte courant |
| `--text-sm` | 13px | 1.45 | 400 | Métadonnées, captions |
| `--text-xs` | 11px | 1.4 | 500 | Labels, badges (uppercase, letter-spacing 0.05em) |

---

## 4. Espacement, rayons, élévation

### 4.1 Spacing scale (8px base)

`--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 24 · `--space-6` 32 · `--space-7` 48 · `--space-8` 64

### 4.2 Border radius

`--radius-sm` 6px · `--radius-md` 10px · `--radius-lg` 14px · `--radius-xl` 20px · `--radius-pill` 999px

### 4.3 Élévation (ombres subtiles uniquement)

`--shadow-sm` `0 1px 2px rgba(28,26,23,0.04)`
`--shadow-md` `0 4px 12px rgba(28,26,23,0.06)`
`--shadow-lg` `0 12px 32px rgba(28,26,23,0.08)`

### 4.4 Bordures

Toutes les bordures sont en hairline `1px solid var(--color-border)`. Pas de bordures épaisses sauf séparateurs structurels (`--color-border-strong`).

---

## 5. Bibliothèque de composants

Tous les composants sont **custom**, jamais natifs (cf. Yumi Standard §22 / CDC §12). Localisés dans `src/components/`.

### 5.1 Communs (`common/`)

- `Button` — variantes : `primary`, `secondary`, `ghost`, `danger` ; tailles `sm`/`md`/`lg`
- `IconButton` — bouton icône carré, accessible (`aria-label` requis)
- `Input` / `Textarea` / `NumberInput` — états : default, focus, error, disabled, readonly
- `Select` — dropdown custom (jamais `<select>` natif)
- `DatePicker` — calendrier custom, support FR/BM
- `Checkbox`, `Radio`, `Switch`, `Slider` — entièrement stylisés
- `Tabs`, `Accordion`, `Breadcrumb`
- `Modal`, `Drawer`, `Tooltip`, `Popover`
- `Toast` — système de notifications centralisé
- `Badge`, `Tag`, `Chip`
- `Skeleton`, `Spinner` (minimaliste, hairline)
- `EmptyState`, `ErrorBoundaryFallback`
- `Scrollbar` — custom hairline (CSS `::-webkit-scrollbar` + Firefox `scrollbar-*`)

### 5.2 Data display

- `KPI Card` — chiffre principal + delta + sparkline optionnelle
- `DataTable` — tri, filtre, pagination, sélection ; props virtualisation pour > 200 rows
- `LineChart`, `BarChart`, `GaugeChart`, `Histogram` (Chart.js wrapper, palette token)
- `MapView` — Leaflet wrapper (Phase 1 carte simple ; Phase 2 OGC WMS/WFS)
- `Timeline` — historique de collectes par site
- `ThresholdIndicator` — vert/orange/rouge selon seuils OMS/maliens, source normative affichée

### 5.3 Layouts

- `AppShell` — sidebar + topbar + main + drawer latéral optionnel
- `PageHeader` — titre, breadcrumb, actions
- `SplitView` — liste + panneau détail (pattern fiche site, fiche alerte)
- `FormSection` — section de formulaire avec titre et description

### 5.4 Spécifiques métier

- `SiteCard` — carte synthétique d'un atelier (statut, dernière collecte, conformité)
- `IndicatorRow` — ligne d'indicateur avec valeur, unité, seuil, source normative, statut
- `AlertCard` — alerte de dépassement (sévérité, site, indicateur, valeur, action)
- `CollectionFormStep` — étape de formulaire terrain (logiques conditionnelles, GPS, photo)
- `OfflineBanner` — bandeau état connexion + file de synchronisation
- `RoleGuard` — wrapper conditionnant le rendu sur `useRole()` (Agent/Superviseur/Admin)

---

## 6. Iconographie

- **Bibliothèque unique** : Lucide Icons (cohérence stricte, pas de mélange).
- Taille standard : 16, 20, 24 px. Stroke width 1.75.
- Aucune emoji.
- Icônes domaine : `Droplet` (eaux), `Wind` (air), `Mountain` (sol), `Trash2` (déchets), `HeartPulse` (santé), `MapPin` (sites), `AlertTriangle` (alertes).

---

## 7. États et feedback

| État | Traitement visuel |
|---|---|
| **Loading** | `Skeleton` aux dimensions du contenu — jamais de spinner global plein écran sauf bootstrap initial |
| **Empty** | `EmptyState` avec illustration sobre + CTA d'action |
| **Error** | `ErrorBoundaryFallback` avec ID de corrélation pour support |
| **Offline** | `OfflineBanner` persistant + indicateur file synchro dans topbar |
| **Disabled** | Opacité 0.5, curseur `not-allowed`, jamais d'éléments invisibles |
| **Focus** | Ring custom : `box-shadow: 0 0 0 3px rgba(181,71,27,0.25)` — JAMAIS le focus natif navigateur |

---

## 8. Theming clair / sombre

Phase 1 : thème clair uniquement (priorité usage extérieur tablette, lisibilité plein soleil).
Phase 2 : thème sombre prévu via `[data-theme="dark"]` sur `<html>` ; tous les tokens sont déjà dérivables.

---

## 9. Responsive & breakpoints

| Breakpoint | Largeur | Cible |
|---|---|---|
| `--bp-sm` | 640px | Mobile (consultation seulement) |
| `--bp-md` | 768px | Tablette portrait — **cible primaire collecte terrain** |
| `--bp-lg` | 1024px | Tablette paysage / petit laptop |
| `--bp-xl` | 1280px | Back-office desktop standard |
| `--bp-2xl` | 1536px | Grands écrans superviseur |

Mobile-first obligatoire (CDC §12). L'app de collecte est conçue **tablette-first portrait**.

---

## 10. Accessibilité — règles non négociables

- Chaque champ a un `<label>` lié (`htmlFor`).
- Tous les contrôles interactifs ont un état `:focus-visible` custom visible.
- Les contrastes sont validés via outil automatisé en CI.
- Les graphiques ont une alternative tabulaire accessible (table cachée pour lecteurs d'écran).
- Navigation clavier complète (Tab, Shift+Tab, Esc, flèches dans menus).
- Annonces `aria-live="polite"` pour les toasts ; `aria-live="assertive"` pour erreurs critiques.
- Pas de couleur seule pour transmettre une information (toujours doublée d'icône ou texte).

---

## 11. Règles de gouvernance du design system

1. **Single source of truth** : `tokens.css` ; toute modification passe par revue.
2. **Pas de styles inline** sauf valeurs dynamiques calculées (positions, transformations).
3. **Pas de `!important`** sauf overrides documentés.
4. **Storybook obligatoire** pour chaque composant `common/` (props, états, exemples).
5. Chaque composant exposé a un `*.types.ts` avec props strictement typées (zéro `any`).
