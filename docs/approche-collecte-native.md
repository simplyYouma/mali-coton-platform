# Approche collecte native — PASET Mali

**Note d'orientation pour le PNUD Mali** · Projet UNDP-MLI-00492

---

## 1. Le constat

À l'origine, nous avions retenu **KoboToolbox / KoboCollect** pour la collecte
terrain. Lors d'une réunion récente, nous avons constaté que **les formulaires
construits côté Kobo ne sont pas alignés avec ce que la plateforme PASET Mali
attend**. Une question ajoutée, reformulée ou supprimée côté Kobo — sans
coordination — et la donnée arrive mal rangée, voire pas du tout.

Ce n'est pas un défaut de Kobo. C'est un défaut **structurel** : deux outils,
deux équipes, pas de contrat fort entre les deux. Tant qu'on reste sur ce
schéma, le risque de désalignement silencieux est permanent — sur un projet
de cette envergure, ce risque est inacceptable.

À cela s'ajoutent : import CSV manuel (pas de temps réel), validation des
seuils *après* la collecte (l'agent ne voit pas une mesure aberrante sur le
terrain), et stockage des données chez un tiers (souveraineté).

---

## 2. La proposition

**Intégrer la collecte terrain directement dans la plateforme PASET Mali**, en y
reproduisant — et en internalisant — la vraie valeur de Kobo : la capacité,
pour un administrateur, de faire évoluer le formulaire à tout moment.

L'agent ouvre la plateforme dans le navigateur de son téléphone, l'épingle sur
son écran d'accueil, et l'utilise comme une application mobile native :
formulaire fluide, **fonctionnement complet hors-ligne**, capture photo, GPS,
synchronisation automatique au retour du réseau.

**Côté admin**, une nouvelle section dédiée — typiquement `/admin/formulaires`
— accueille le *form-builder* : types de question (nombre, texte, photo, GPS,
choix multiple), ordre et regroupement, logique conditionnelle, et surtout
**versionnement de formulaire**. Cette page reste distincte du catalogue
d'indicateurs (`/admin/indicateurs`), qui continue de gérer les paramètres
mesurés et leurs seuils. Le form-builder *consomme* ce catalogue : chaque
question s'appuie sur un indicateur défini, sans le mélanger avec la
mécanique de structuration du questionnaire.

Chaque modification publie une nouvelle version du formulaire ; les agents
reçoivent la dernière à leur prochaine synchronisation ; les anciennes
collectes restent lisibles indéfiniment.

Résultat : **un administrateur publie une nouvelle version le matin et la voit
utilisée par les agents l'après-midi**, sans déploiement, sans coordination
inter-équipes, sans risque de désalignement. Le formulaire et la base de
données sont gérés au même endroit, par la même équipe, sur le même schéma.

---

## 3. Pour l'agent terrain, rien ne se dégrade

| Aspect | KoboCollect aujourd'hui | Plateforme native demain |
|---|---|---|
| Saisie d'une visite | Formulaire Kobo | Formulaire PASET Mali (même fluidité) |
| Hors-ligne | Oui | Oui |
| Photos · GPS | Oui | Oui |
| Synchronisation | Manuelle | Automatique au retour réseau |
| Validation des seuils | Après l'import | **Immédiate, sur le terrain** |
| Historique de ses collectes | Limité | **Complet sur la plateforme** |

---

## 4. Pourquoi c'est faisable sans risque

Cette évolution **n'est pas une refonte**. La plateforme est déjà bâtie sur le
bon paradigme :

- File de synchronisation des collectes — **déjà implémentée** (`useSyncQueue`).
- Stockage local persistant **(IndexedDB)** — **déjà utilisé**.
- Catalogue d'indicateurs administrable — **déjà en place** (`/admin/indicateurs`).
- Schéma de collecte par indicateur (pas par colonne fixe) — **déjà conçu ainsi**.
- Rôles agent / superviseur / admin — **déjà gérés**.

Côté technique, on s'appuie sur des standards web matures.

### Qu'est-ce qu'une *Progressive Web App* (PWA) ?

Une PWA est un site web qui se comporte comme une application mobile : on
l'ouvre depuis le navigateur du téléphone, on l'**épingle sur l'écran
d'accueil**, et elle s'utilise comme une vraie app — y compris sans réseau.
Sous le capot, un *Service Worker* (petit programme installé en arrière-plan)
garde l'application disponible hors-ligne et gère la file de synchronisation.
L'accès à l'appareil photo et au GPS est natif. Mêmes technologies que
Twitter Lite, Spotify, ou les applications de santé communautaire déployées
dans des zones à faible connectivité.

### Pourquoi une PWA et pas une app Flutter / native ?

La question est légitime — Flutter est une excellente option pour les
applications mobiles. Dans notre contexte précis, la PWA est plus adaptée :

| Critère | PWA | Application Flutter |
|---|---|---|
| **Codebase** | Une seule, partagée avec la plateforme web | Une codebase mobile séparée à maintenir en plus |
| **Distribution** | URL à ouvrir dans le navigateur (pas de Play Store) | Compte développeur Play Store, processus de publication, validation |
| **Mises à jour** | Instantanées au prochain chargement | Push via Play Store, dépend de l'utilisateur |
| **Taille d'installation** | ~5 Mo | 30 à 50 Mo |
| **Délai de mise en place** | Quelques semaines | Plusieurs mois (équipe mobile dédiée) |
| **Cohérence avec la plateforme web** | Native (même code, même schéma) | Réplication des règles métier |

Pour un projet avec **6 sites pilotes**, des **agents identifiés et formés
directement**, et **pas de besoin de présence Play Store**, le coût de
maintenir une codebase mobile séparée n'est pas justifié. La PWA donne **toutes
les capacités terrain attendues** (offline, photo, GPS, sync différée) en
restant **dans la même base de code que la plateforme** — ce qui élimine, par
construction, le risque de divergence qu'on cherche précisément à éviter.

Si demain le besoin évolue (présence Play Store, fonctionnalités natives
spécifiques), la PWA peut être **emballée dans une enveloppe native via
Capacitor** sans réécriture. C'est une porte qui reste ouverte.

---

## 5. En une phrase

> En internalisant la collecte et en reproduisant la flexibilité du form-builder
> Kobo dans `/admin/indicateurs`, on règle par construction le problème de
> désalignement constaté, on gagne en souveraineté et en temps réel, et on
> préserve intégralement l'expérience terrain de l'agent.

---

*Document préparé par l'équipe technique PASET Mali pour discussion préalable au COPIL.*
