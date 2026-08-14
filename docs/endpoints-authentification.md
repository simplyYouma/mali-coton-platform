# Endpoints d'authentification à créer — PASET Mali

**Note technique à l'attention du responsable backend** · Projet UNDP-MLI-00492

---

## 1. Constat

Le backend n'expose aujourd'hui qu'un seul endpoint d'authentification. Relevé
sur le schéma OpenAPI publié (`https://api.back-paset.com/api/docs`) :

```
/api/login_check          connexion — existe et répond
```

Rien d'autre. Ni réinitialisation de mot de passe, ni renouvellement de jeton.

Conséquence immédiate : le lien **« Mot de passe oublié ? »** de l'écran de
connexion ne mène nulle part. Un agent ou un superviseur qui perd son mot de
passe n'a aucun moyen de le récupérer — il faut une intervention manuelle en
base.

Sur un déploiement destiné à des agents de terrain équipés de tablettes
partagées, c'est un point de blocage certain.

---

## 2. Les trois endpoints nécessaires

### 2.1 Demande de réinitialisation

```
POST /api/password/forgot
Content-Type: application/json

{ "email": "agent.bamako@sahel.com" }
```

Génère un jeton à usage unique, l'associe au compte, et envoie par e-mail un
lien de la forme `https://paset-mali.com/reinitialiser/{token}`.

**Réponse attendue — toujours identique, que l'adresse existe ou non :**

```
204 No Content
```

> **Exigence de sécurité.** Répondre `404` quand l'adresse est inconnue
> transformerait cet endpoint en moyen de découvrir qui possède un compte sur
> la plateforme. La réponse doit être indiscernable dans les deux cas, y
> compris en temps de réponse.

Prévoir une limitation du nombre de demandes par adresse et par IP — cinq par
heure est un usage courant.

### 2.2 Vérification du jeton

```
GET /api/password/reset/{token}
```

Appelé à l'ouverture du lien reçu par e-mail, avant d'afficher le formulaire.
Évite de faire saisir un nouveau mot de passe pour découvrir ensuite que le
lien a expiré.

**Réponses :**

| Code | Cas |
|---|---|
| `200 OK` | jeton valide — l'interface affiche le formulaire |
| `410 Gone` | jeton expiré ou déjà utilisé |
| `404 Not Found` | jeton inconnu |

### 2.3 Application du nouveau mot de passe

```
POST /api/password/reset
Content-Type: application/json

{ "token": "…", "password": "…" }
```

**Réponses :**

| Code | Cas |
|---|---|
| `204 No Content` | mot de passe changé, jeton invalidé |
| `410 Gone` | jeton expiré ou déjà utilisé |
| `422 Unprocessable Entity` | mot de passe refusé — voir ci-dessous |

En cas de `422`, renvoyer le motif dans le format d'erreur déjà employé par
API Platform, afin que l'interface l'affiche tel quel :

```json
{ "hydra:description": "Le mot de passe doit compter au moins 8 caractères." }
```

---

## 3. Deux exigences transverses

**Expiration du jeton.** Une heure est l'usage courant. Au-delà, le lien doit
répondre `410` plutôt que d'être accepté.

**Usage unique.** Le jeton est invalidé dès qu'il a servi. Un lien réutilisé,
par exemple retrouvé dans l'historique d'un navigateur sur une tablette
partagée, ne doit plus rien permettre.

---

## 4. Ce que fait le frontend, et ce qu'il attend

Le parcours côté interface — écran de demande, écran de saisie du nouveau mot
de passe, messages d'erreur, retour à la connexion — sera développé dès que
ces trois endpoints existeront.

Il n'est volontairement pas construit avant : un parcours qui ne peut pas
aboutir en production n'a pas d'intérêt, et le simuler donnerait une fausse
impression d'avancement.

Le contrat ci-dessus suffit à travailler en parallèle : dès que les endpoints
répondent, le branchement est immédiat.

---

## 5. Sujet voisin, à trancher séparément

`/api/login_check` délivre un jeton JWT, mais **aucun endpoint ne permet de le
renouveler**. À son expiration, l'utilisateur est déconnecté sèchement.

Sur une tablette de terrain, cela signifie qu'une agente peut perdre une
collecte en cours de saisie parce que sa session a expiré pendant qu'elle
remplissait le formulaire.

Un `POST /api/token/refresh` résoudrait le problème. Ce n'est pas dans le
périmètre de la réinitialisation de mot de passe, mais cela relève de la même
discussion et mérite d'être arbitré en même temps.
