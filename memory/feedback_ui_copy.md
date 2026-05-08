---
name: Copy & micro-textes UI
description: Règle de rédaction des textes visibles utilisateur — pas de méta-références au CDC ni à la tech-spec
type: feedback
---

**Règle** : ne JAMAIS afficher de méta-références au cahier des charges, à la tech-spec ou à des articles de loi en justification de design dans l'interface utilisateur. Concrètement, bannir des hints / descriptions / footers / aria-labels les patterns du genre :
- "(CDC §X.Y)"
- "tech-spec §X"
- "Conforme CDC §X"
- "Loi malienne 2013-015 §..." utilisée comme caution
- Tout numéro d'article cité comme légitimation.

**Why** : Youma a explicitement signalé le 2026-04-28 que ces références polluent l'UX et n'intéressent pas le client PNUD ni les agents terrain. Le client veut un produit fini qui *parle métier*, pas un produit qui se justifie en permanence vis-à-vis du contrat.

**How to apply** :
- En *commentaire de code* (`//` ou JSDoc), on PEUT et on DOIT garder ces ancrages — c'est précieux pour les devs qui reprennent.
- Dans le *texte UI* visible à l'utilisateur, on parle métier : "Validez la collecte pour transmission définitive" plutôt que "Validez la collecte pour transmission définitive (CDC §7.5)".
- **Exception** : les **sources normatives par indicateur** (OMS, Norme MN-03-02/002:2006, Décret n°96-178/P-RM) RESTENT visibles parce qu'elles sont une donnée métier livrable contractuelle (§8.6) — l'agent doit savoir contre quel seuil sa mesure est comparée. Ce qu'on retire, ce sont les références au CDC/tech-spec eux-mêmes.
- Toute nouvelle page/composant : relire les `description`, `hint`, `subtitle`, `aria-label` avant commit pour vérifier l'absence de ces patterns.
