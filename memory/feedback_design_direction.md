---
name: Direction esthétique
description: Direction visuelle finale — clean, international, sophistiqué, palette bleu coton doux
type: feedback
---

**Règle absolue** : ne JAMAIS justifier un choix de design par "parce que le projet concerne le Mali / l'Afrique" de manière folklorique (ex : "rouille car teinture", "indigo car GALA"). C'est paresseux et patronisant. La modernité n'a pas de frontière — un projet PNUD Mali mérite la même qualité de design international qu'un projet européen ou américain.

**Why** : Youma a explicitement rejeté ma première proposition "rouille + indigo" justifiée par les couleurs des teintures locales, puis la direction "deep teal" comme trop froide / sombre. Elle veut quelque chose de "mieux travaillé et original", avec **un bleu clair rappelant la douceur du coton** comme fil conducteur (référence subtile au nom "Mali Coton", pas folklorique).

**How to apply** : choix esthétiques basés sur la lisibilité, l'élégance, la modernité, la sophistication. La référence "coton" est dans la *douceur* (bleu clair, surfaces lumineuses, radii généreux), pas dans des motifs ou clichés culturels.

**Direction validée (avril 2026)** :
- Palette primaire : **bleu coton doux** `#4a7fa7` (slot `--color-brand-rust`), hover `#3a6889`, soft `#eaf2f8`
- Secondaire : **navy profond** `#14253a` pour le contraste
- Accent : **sand chaud** `#e8c987` à doser (highlights, footer cards)
- Fond app très légèrement teinté bleu (`#f4f7fa`), surfaces blanches pures
- Typographie **clean sans-serif uniquement** (Inter) — pas de serif éditorial
- Radii généreux (12-20px) pour un feeling soft et moderne
- Espace blanc abondant
- Iconographie Lucide stroke fin (1.5)

**Note de gouvernance** : les variables CSS `--color-brand-rust*` et `--color-brand-indigo*` sont conservées comme slots `primary`/`secondary` pour compatibilité interne — leurs noms ne reflètent plus la couleur réelle.
