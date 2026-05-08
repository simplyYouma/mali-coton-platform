# Cahier des charges — Plateforme Mali Coton

> Document unique de référence du **périmètre fonctionnel et technique** de la plateforme.
> Tout ce qui n'est pas dans la plateforme (organisation projet, équipes, calendrier de mission) est *hors document*.

---

## 1. Vision

Plateforme web sécurisée qui **ingère**, **enrichit**, **analyse** et **restitue** les données socio-environnementales des sites de teintureries artisanales suivis dans le cadre du projet PNUD Mali Coton (UNDP-MLI-00492).

La plateforme **ne collecte pas** sur le terrain. Elle reçoit les données **brutes de KoboToolbox/ODK** et les **résultats laboratoire** (LNE Bamako), et produit en sortie tableaux de bord, alertes et rapports officiels.

---

## 2. Pipeline de données — de A à Z

```
┌─────────────────────────┐    ┌───────────────────────┐    ┌────────────────────┐
│  TERRAIN                │    │  LABORATOIRE          │    │  RÉFÉRENTIELS      │
│  KoboToolbox / ODK      │    │  LNE Bamako           │    │  OMS · Norme MN    │
│  · in-situ (pH, PM,…)   │    │  · analyses physico-  │    │  · seuils alertes  │
│  · GPS + photos         │    │    chimiques + métaux │    │  · indicateurs     │
│  · santé / EPI / socio  │    │  · bordereau certifié │    │  · sites & rôles   │
└────────────┬────────────┘    └───────────┬───────────┘    └─────────┬──────────┘
             │ webhook / API                │ saisie / import         │ admin
             ▼                              ▼                         ▼
        ╔══════════════════════════════════════════════════════════════════╗
        ║                  API REST  ·  PostgreSQL/PostGIS                  ║
        ║                                                                   ║
        ║  ① Ingestion       ② Validation       ③ Enrichissement            ║
        ║     normalisation     RBAC + workflow    conformité auto vs seuils║
        ║                       superviseur                                 ║
        ║                                                                   ║
        ║  ④ Stockage         ⑤ Workflow labo    ⑥ Détection alertes        ║
        ║     historisation     prélèvement →      moteur de règles         ║
        ║     géolocalisation   échantillon →      (seuil, retard, silence) ║
        ║                       analyse → résultat                          ║
        ╚══════════════════════════════════════════════════════════════════╝
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────────┐
│ TABLEAUX BORD    │         │ ALERTES          │         │ RAPPORTS             │
│ · synthèse sites │         │ · email + UI     │         │ · mensuel auto       │
│ · tendances      │         │ · pulsation temps│         │ · trimestriel        │
│ · cartographie   │         │   réel           │         │ · final consolidé    │
│ · indice composi.│         │ · accusé / clôt. │         │ · PDF + XLSX         │
└──────────────────┘         └──────────────────┘         └──────────────────────┘
```

**3 sources d'entrée → 6 étapes pipeline → 3 sorties**. Chaque flèche traverse une API REST sécurisée (JWT), aucun composant ne court-circuite la chaîne.

---

## 3. Modules de la plateforme

| # | Module | Phase | Responsabilité |
|---|---|---|---|
| 1 | **Sites** | 1 | Référentiel des ateliers — fiche, GPS, statut, historique. Multi-zones de prélèvement (effluents · puits témoin · cours d'eau). |
| 2 | **Collectes** | 1 | Ingestion Kobo, traçabilité, validation superviseur, demande de correction, rejet. |
| 3 | **Tableaux de bord** | 1 | Synthèse globale, par site, par domaine. Indicateurs OMS/Mali en vert/orange/rouge. |
| 4 | **Administration** | 1 | RBAC dynamique (rôles + permissions par module), gestion utilisateurs, normes & seuils, journal d'audit. |
| 5 | **Cartographie** | 2 | Carte interactive géolocalisée, couches OGC (WMS/WFS) par domaine, surcouches alertes/collectes/cours d'eau. |
| 6 | **Analytics** | 2 | Tendances temporelles, comparatif inter-sites, indice composite, filtrage dynamique. |
| 7 | **Reporting** | 2 | Génération automatique mensuel/trimestriel/final — composition règle + rendu A4 PDF + export XLSX. |
| 8 | **Alertes** | 2 | Moteur de règles (dépassement seuil, retard labo, silence site, qualité données) + notifications email. |
| 9 | **Laboratoire** | 1 → 2 | Pile prélèvement → échantillon → analyse → résultat ; espace dédié à l'agent labo. |

---

## 4. Profils utilisateurs

| Profil | Périmètre |
|---|---|
| **Administrateur** | Accès total. Gère utilisateurs, rôles, permissions, paramètres système, normes, configurations techniques. |
| **Superviseur** | Pilotage métier. Valide / corrige / rejette les collectes. Saisit ou importe les résultats labo. Exploite tableaux de bord et rapports. |
| **Agent de collecte** | Compte rattaché à ses sites assignés. Sa saisie terrain transite par Kobo ; sur la plateforme il consulte ses propres collectes, traite les demandes de correction, suit ses échantillons. |
| **Agent laboratoire** | Voit les échantillons reçus, lance/joint les analyses, transmet les bordereaux au superviseur. |
| **Visiteur / Observateur** | Lecture seule sur tableaux de bord et rapports autorisés. |

> Les rôles sont **dynamiques** : un administrateur peut créer un nouveau rôle ou ajuster les permissions sans toucher au code.

---

## 5. Workflow d'une collecte (cas nominal)

```
Kobo  →  Ingestion API  →  Collecte « soumise »
                                  │
                                  ├──> a/ Aucun prélèvement labo  →  Superviseur valide → Validée
                                  │
                                  └──> b/ Prélèvement requis  →  Échantillon créé (statut "en transit")
                                            │
                                            └──> Agent labo reçoit  →  Analyse  →  Résultat joint
                                                       │
                                                       └──> Superviseur confronte aux normes
                                                                  │
                                                                  ├──> Validée
                                                                  ├──> À corriger (agent peut renvoyer)
                                                                  └──> Rejetée (motif consigné)
```

À chaque transition : journal d'audit, horodatage, identité utilisateur, traçabilité totale.

---

## 6. Référentiels & règles

- **Indicateurs** : ~30 paramètres répartis sur 6 domaines (eaux usées physiques, eaux physico-chimiques, métaux lourds eau & sol, sol, air, déchets, santé, socio-éco). Chaque indicateur porte unité, méthode, seuils min/max, source normative.
- **Sources normatives** : OMS (eau 2017, air 2021, EHC métaux), Norme malienne MN-03-02/002:2006, Lois 2021-032 / 02-006, Décrets 01-394/96-178/96-030, Conv. OIT 148, IARC vol. 100, Loi 2013-015 (données personnelles).
- **Règles d'alerte** : déclenchées par des conditions paramétrables côté admin (`indicateur > seuil`, `lab_pending > N jours`, `site sans collecte > N jours`, `mesure incohérente vs historique`).

---

## 7. Sorties

| Sortie | Public | Format | Cadence |
|---|---|---|---|
| Tableau de bord global | Superviseurs, admin, comité | Web temps réel | Continu |
| Tableau de bord par site | Superviseur, agent collecte | Web | Continu |
| Cartographie multi-couches | Tous (selon droits) | Web interactive | Continu |
| Alerte critique | Superviseur, admin | Email + notif UI | Temps réel |
| Rapport mensuel | Superviseurs, PNUD | PDF + XLSX | Mensuel |
| Rapport trimestriel | Comité de pilotage | PDF + XLSX | Trimestriel |
| Rapport final | PNUD + Ministère | PDF + XLSX | Fin de mission |
| Export brut données | Admin, superviseur | XLSX / CSV | À la demande |

---

## 8. Stack technique

| Couche | Composant |
|---|---|
| Front-end | React + TypeScript · NGINX reverse proxy · BunkerWeb WAF · HTTPS |
| Back-end | API REST Symfony (PHP) · JWT · RBAC dynamique |
| Base de données | PostgreSQL + PostGIS · sauvegardes quotidiennes |
| Source terrain | KoboToolbox / ODK (offline → sync auto) |
| Source labo | Saisie / import (LNE Bamako et autres labos référentiels) |
| Hébergement | Cloud sécurisé · conteneurisation Docker · haute disponibilité |
| Cartographie | Leaflet + couches OGC WMS/WFS |

---

## 9. Sécurité & gouvernance

- HTTPS obligatoire · JWT court · refresh sécurisé.
- RBAC dynamique : permissions stockées en base, modifiables par l'administrateur sans déploiement.
- Journalisation complète (audit trail) de toute action sensible : création/modification/suppression, validation/rejet, export.
- Anonymisation des données santé sensibles à l'export.
- Conformité Loi malienne n°2013-015 sur les données personnelles.
- Sauvegardes automatiques + plan de reprise.

---

## 10. Principes UI

- **Une page = une intention.** Pas de petits textes explicatifs disséminés. Si une zone a besoin d'un paragraphe pour être comprise, elle est mal conçue.
- **Tableaux et graphiques d'abord** ; le texte n'apparaît que pour cadrer une lecture (titre, eyebrow, libellé d'unité, source normative).
- **Statut visible immédiatement** par couleur + icône (vert/orange/rouge selon conformité ; halo pulsé pour alertes critiques).
- **Aucune magie** : tout libellé / valeur / recommandation est traçable par règle ou source documentée.
- **Densité maîtrisée** : aucune fiche n'expose plus de 6 KPI ; aucune table ne dépasse 8 colonnes ; le reste passe en détail/expand.

---

## 11. Hors périmètre plateforme

Pour mémoire — ces sujets existent dans le projet mais ne relèvent **pas** de cette plateforme :

- Construction d'infrastructures de traitement des eaux.
- Recrutement et gestion contractuelle des artisans.
- Formations environnementales sur site.
- Communication institutionnelle externe.
- Gestion administrative du projet Mali Coton.
