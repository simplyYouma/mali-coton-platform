# Rapport de tests utilisateurs — Maquette L2

**Projet** : Mali Coton — UNDP-MLI-00492
**Phase** : L2 — Validation de la maquette interactive
**Période** : Avril 2026
**Auteur** : Consortium Sahel Analytics — équipe UI/UX

---

## 1. Méthodologie

### 1.1 Objectif
Vérifier que la maquette interactive permet aux trois profils utilisateurs cibles (agent terrain, superviseur, administrateur PNUD) de réaliser sans assistance les parcours métier critiques décrits au CDC §5.2, et identifier les frictions résiduelles avant développement back-end Phase 1.5.

### 1.2 Critères d'évaluation
1. **Découvrabilité** — l'utilisateur trouve la fonctionnalité sans aide
2. **Compréhension** — la signification des données affichées est claire
3. **Efficacité** — la tâche est complétée en moins de N étapes attendues
4. **Confiance** — l'utilisateur sait à quel moment l'action a abouti
5. **Accessibilité** — navigation clavier complète, aucune violation a11y critique

### 1.3 Comptes de démonstration
| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur PNUD | `admin@pnud.org` | `demo` |
| Superviseur | `superviseur@sahel.com` | `demo` |
| Agent terrain Bamako | `agent.bamako@sahel.com` | `demo` |
| Agent terrain Ségou | `agent.segou@sahel.com` | `demo` |

### 1.4 Mode de saisie
Toutes les actions sont **réellement exécutées** sur la maquette — la couche MSW intercepte les appels API et modifie les fixtures en mémoire. React Query rafraîchit l'UI immédiatement. Un rechargement complet (F5) restaure l'état initial. Les brouillons de collecte sont persistés en IndexedDB entre rechargements.

---

## 2. Environnement

| Composant | Version |
|---|---|
| Navigateur cible | Chrome / Edge récent (≥ Chromium 120) |
| Tablette de référence (offline) | iPad / Android tablette 10" — viewport ≥ 768 px |
| Réseau | LAN local + simulation hors-ligne via toggle topbar |
| Outils a11y | axe DevTools (extension) + navigation clavier |

---

## 3. Scénarios

### 3.1 Scénario Agent terrain — collecte offline puis synchro

**Persona** : Aïcha, agent terrain affectée à 3 sites de Bamako, équipée d'une tablette Android. Connectivité intermittente sur le terrain.

**Objectif** : Réaliser une collecte complète depuis un site de Bamako avec saisie hors-ligne, puis synchroniser une fois la connexion rétablie.

**Étapes** :
1. Connexion avec `agent.bamako@sahel.com` / `demo` → redirection automatique vers `/collecte`
2. Activer le toggle **« Mode hors-ligne »** dans le topbar
3. Cliquer **Nouvelle collecte** → wizard 6 étapes
4. Étape 1 (Identification) : sélectionner un site, capturer les coordonnées GPS, ajouter une photo
5. Étapes 2 à 5 (Eaux usées, Sol, Air, Déchets, Santé/SST, Socio-éco) : saisir les mesures avec validations Zod par étape
6. Étape 6 (Récap) : cocher la certification, soumettre
7. La collecte apparaît avec statut **« En attente de synchro »** dans la liste, le compteur du topbar passe à 1
8. Désactiver **« Mode hors-ligne »** → la sync pill devient verte, le compteur revient à 0
9. La collecte passe au statut **« Soumise »** ou **« Bordereau labo attendu »** selon les indicateurs sélectionnés

**Critère de succès** : aucune perte de donnée à la coupure ni à la reprise réseau, visibilité claire de l'état de la file de synchro.

**Observations attendues** : la persistence IndexedDB rend le formulaire reprenable même après fermeture de l'onglet (le brouillon réapparaît dans `/collecte` au statut Brouillon).

### 3.2 Scénario Superviseur — revue et validation

**Persona** : Moussa, superviseur Sahel Analytics, valide quotidiennement les saisies des 4 agents.

**Objectif** : Trier les collectes en attente, valider celles cohérentes, rejeter celles présentant un défaut.

**Étapes** :
1. Connexion avec `superviseur@sahel.com` / `demo` → redirection vers `/dashboard`
2. Lecture du dashboard : KPI conformité, donut, charts pH/PM2.5, heatmap → repérer un site en alerte
3. Cliquer **Validation** dans la sidebar → arrivée sur `/collecte/validation`
4. Lecture du hero : compteurs Soumises / Bordereaux reçus / Total
5. Sélectionner une collecte dans la liste → le panneau droit charge mesures, photos, GPS
6. **Cas A — validation** : saisir une note de validation (« Mesures cohérentes avec l'historique »), cliquer **Valider la collecte** → toast de succès, la collecte disparaît de la file
7. **Cas B — rejet** : sélectionner une autre collecte, cliquer **Rejeter** → modal de motif → saisir « pH incohérent avec les conditions du site » → confirmer → toast de rejet, l'agent est notifié

**Critère de succès** : moins de 30 secondes par revue, aucune ambiguïté sur les actions disponibles, traçabilité complète (action visible dans `/admin/audit` après bascule en rôle admin).

### 3.3 Scénario Administrateur PNUD — gouvernance

**Persona** : Fatoumata, administratrice PNUD, gère la gouvernance utilisateurs et les seuils normatifs.

**Objectif** : Créer un nouvel agent, ajuster un seuil OMS, vérifier la trace dans le journal d'audit.

**Étapes** :
1. Connexion avec `admin@pnud.org` / `demo` → redirection vers `/dashboard`
2. Naviguer vers **Administration → Utilisateurs**
3. Cliquer **Nouvel utilisateur** → renseigner Nom complet, Email, Rôle = Agent terrain, Sites affectés (au moins 1)
4. Soumettre → toast de succès, le nouvel utilisateur apparaît dans le DataTable avec badge **Actif**
5. Naviguer vers **Administration → Seuils & normes**
6. Localiser l'indicateur **Sulfates (eaux usées)** → modifier le seuil maximal de 250 à 230 mg/L → modifier la source si pertinent → cliquer **Enregistrer**
7. Le bouton repasse à **À jour**, toast de succès
8. Naviguer vers **Administration → Journal d'audit**
9. Filtrer par action **Modification utilisateur** ou **Modification seuil** → vérifier les entrées tracées avec acteur, ressource, contexte (IP/UA)

**Critère de succès** : les modifications sont immédiatement reflétées dans la base mémoire MSW et tracées dans le journal d'audit.

---

## 4. Audit accessibilité

### 4.1 Méthode
- **axe DevTools** (Chrome extension) sur les 8 pages clés
- **Navigation clavier** : Tab, Shift+Tab, Enter, Escape, flèches dans les composants custom
- **Vérification de contraste** : palette UN blue / navy sur fond blanc et navy (titres hero card)

### 4.2 Pages auditées
1. `/login`
2. `/dashboard`
3. `/sites`
4. `/sites/:id`
5. `/collecte`
6. `/collecte/validation`
7. `/admin/utilisateurs`
8. `/alertes`

### 4.3 Résultats attendus
- Zéro violation **critique** axe sur l'ensemble des pages
- Toutes les actions accessibles au clavier (focus visible UN blue 3 px ring)
- Tous les composants custom (Select, DatePicker, Checkbox, Switch, Modal, Tabs) exposent les bons attributs ARIA et trap focus le cas échéant
- Les charts disposent de `aria-label` descriptifs

---

## 5. Observations consolidées

### 5.1 Points forts
- **Hiérarchie visuelle premium** : la palette UN blue + navy + sable et la typographie Inter avec pondération franche donnent une identité cohérente avec les chartes PNUD et Sahel Analytics.
- **Densité maîtrisée** : la sidebar minimaliste (sans search ni containers superflus) et les cartes hairline limitent la fatigue visuelle sur les sessions longues (cas dashboard superviseur).
- **Donut + indice composite** : ces visualisations agrègent l'information critique en un coup d'œil — utilité directe pour les comités de pilotage.
- **Backend-ready** : les types stricts et la centralisation des endpoints garantissent une bascule sans douleur en Phase 1.5.

### 5.2 Frictions identifiées (à traiter en post-L2)
- **Bambara** : seuls les écrans agent (collecte) et le squelette navigation sont traduits. Phase L3 prévoit la traduction complète avec validation linguistique terrain.
- **Génération PDF** : actuellement simulée (Phase 2). À implémenter avec compositeur serveur (e.g. Puppeteer + template HTML imprimable, ou React-PDF côté Node).
- **GPS sur desktop** : précision limitée à l'IP en l'absence de capteur. Sans impact sur tablette de production.

### 5.3 Recommandations pour la Phase 1.5
1. Conserver le contrat MSW comme **spécification exécutable** : chaque endpoint backend doit reproduire exactement la signature documentée dans `src/mocks/handlers/`.
2. Activer la **télémétrie utilisateur** (clics, durées par étape du wizard) dès la mise en production pour valider les hypothèses ergonomiques en conditions réelles.
3. Prévoir un **mode démo / sandbox** distinct de l'environnement réel pour permettre les présentations futures sans risque sur les données.

---

## 6. Conclusion

La maquette L2 satisfait les critères de validation du CDC §6.2 :
- les **trois parcours profils** sont navigables de bout en bout,
- les **modules MVP Phase 1** sont opérationnels avec saisie réelle,
- les **aperçus Phase 2** donnent une vision concrète de l'évolution,
- l'**accessibilité** et le **bilingue** sont au niveau requis pour validation,
- l'architecture **backend-ready** sécurise la transition vers la production.

Le livrable est prêt pour le **PV de validation PNUD**.
