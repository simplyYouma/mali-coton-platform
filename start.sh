#!/usr/bin/env bash
#
# PASET Mali — lanceur de developpement
#
# Demarre le serveur Vite et ouvre le navigateur. Double-cliquable.
#
#   ./start.sh          mode API par defaut (celui de votre .env.local, sinon live)
#   ./start.sh mock     force les donnees de demonstration (MSW, aucun backend requis)
#   ./start.sh live     force le backend reel
#   ./start.sh --no-browser    ne pas ouvrir le navigateur
#
# Sous Windows, si le double-clic sur ce fichier ne fait rien : utilisez start.bat.

set -uo pipefail

# Se placer dans le dossier du script : le double-clic peut partir de n'importe ou.
cd "$(dirname "${BASH_SOURCE[0]}")" || {
  echo "Impossible d'acceder au dossier du projet." >&2
  exit 1
}

# ── Presentation ──────────────────────────────────────────────────────────────

if [ -t 1 ] && [ "${TERM:-dumb}" != "dumb" ]; then
  B=$'\033[1m'; DIM=$'\033[2m'; R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'; C=$'\033[36m'; Z=$'\033[0m'
else
  B=''; DIM=''; R=''; G=''; Y=''; C=''; Z=''
fi

step()  { printf '%s\n' "${C}▸${Z} $*"; }
ok()    { printf '%s\n' "  ${G}✓${Z} ${DIM}$*${Z}"; }
warn()  { printf '%s\n' "  ${Y}!${Z} $*"; }

# Garde la fenetre ouverte apres un double-clic, sinon elle se ferme aussitot.
pause_if_clicked() {
  if [ -t 0 ]; then
    printf '\n%s' "${DIM}Appuyez sur Entree pour fermer cette fenetre…${Z}"
    read -r _ || true
    printf '\n'
  fi
}

# Erreur fatale : on dit ce qui ne va pas, PUIS comment le reparer.
die() {
  local titre="$1"; shift
  printf '\n%s\n' "${R}${B}✗ ${titre}${Z}" >&2
  local ligne
  for ligne in "$@"; do
    printf '  %s\n' "$ligne" >&2
  done
  pause_if_clicked
  exit 1
}

# ── Arguments ─────────────────────────────────────────────────────────────────
# Analyses en premier : --help et une faute de frappe doivent repondre tout de
# suite, sans attendre une eventuelle installation des dependances.

MODE_FORCE=""
OUVRIR_NAVIGATEUR="oui"
APERCU="non"

aide() {
  printf '\n%s\n' "Usage : ./start.sh [mock|live|pwa] [--no-browser]"
  printf '%s\n'   "  mock          donnees de demonstration, aucun backend requis"
  printf '%s\n'   "  live          backend reel"
  printf '%s\n'   "  pwa           build de production + apercu : seul mode ou"
  printf '%s\n'   "                l'application est installable"
  printf '%s\n'   "  --no-browser  ne pas ouvrir le navigateur automatiquement"
  printf '\n'
}

for arg in "$@"; do
  case "$arg" in
    mock|--mock) MODE_FORCE="mock" ;;
    live|--live) MODE_FORCE="live" ;;
    pwa|--pwa)   APERCU="oui" ;;
    --no-browser|--sans-navigateur) OUVRIR_NAVIGATEUR="non" ;;
    -h|--help|--aide) aide; exit 0 ;;
    *)
      die "Option inconnue : ${arg}" \
          "Usage : ./start.sh [mock|live|pwa] [--no-browser]" \
          "" \
          "  mock          donnees de demonstration, aucun backend requis" \
          "  live          backend reel" \
          "  pwa           build de production + apercu (application installable)" \
          "  --no-browser  ne pas ouvrir le navigateur automatiquement" ;;
  esac
done

# L'application installable repose sur un service worker, et MSW occupe deja
# cette place en mode mock : les deux ne peuvent pas coexister.
if [ "$APERCU" = "oui" ] && [ "$MODE_FORCE" = "mock" ]; then
  die "Les modes 'pwa' et 'mock' sont incompatibles." \
      "L'application installable repose sur un service worker." \
      "MSW, qui sert les donnees de demonstration, en pose deja un — et une" \
      "page ne peut etre controlee que par un seul service worker a la fois." \
      "" \
      "Lancez ${B}./start.sh pwa${Z} seul : l'apercu tourne alors sur le backend reel."
fi
if [ "$APERCU" = "oui" ]; then MODE_FORCE="live"; fi

printf '\n%s\n' "${B}PASET Mali${Z} ${DIM}— environnement de developpement${Z}"
printf '%s\n\n' "${DIM}────────────────────────────────────────────${Z}"

# ── 1. Le script est-il bien dans le projet ? ─────────────────────────────────

step "Verification du projet"

[ -f package.json ] || die \
  "Fichier package.json introuvable." \
  "Ce script doit rester a la racine du projet, a cote de package.json." \
  "" \
  "Dossier ou il a cherche :" \
  "  $(pwd)"

if ! grep -q '"mali-coton-platform"' package.json 2>/dev/null; then
  die "Ce dossier ne contient pas le projet PASET Mali." \
      "Le package.json trouve appartient a un autre projet." \
      "" \
      "Dossier :" \
      "  $(pwd)"
fi
ok "projet trouve dans $(pwd)"

# ── 2. Node.js ────────────────────────────────────────────────────────────────

step "Verification de Node.js"

if ! command -v node >/dev/null 2>&1; then
  die "Node.js n'est pas installe (ou pas visible depuis ce terminal)." \
      "Le projet ne peut pas demarrer sans lui." \
      "" \
      "A faire :" \
      "  1. Telecharger la version LTS sur ${B}https://nodejs.org${Z}" \
      "  2. L'installer en laissant toutes les options par defaut" \
      "  3. ${B}Fermer et rouvrir${Z} cette fenetre, puis relancer ce script" \
      "" \
      "${DIM}(l'etape 3 est indispensable : le terminal ne voit pas les${Z}" \
      "${DIM} programmes installes pendant qu'il etait deja ouvert)${Z}"
fi

NODE_CHEMIN="$(command -v node)"

# On garde la sortie d'erreur : quand node refuse de demarrer, c'est elle
# qui explique pourquoi. La masquer ne laisserait qu'un message vide.
NODE_SORTIE="$(node -v 2>&1)"; NODE_CODE=$?
NODE_VERSION="$(printf '%s' "$NODE_SORTIE" | tr -d '\r' | head -1)"   # ex. v22.13.0
NODE_MAJOR="${NODE_VERSION#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"

if [ "$NODE_CODE" -ne 0 ] || ! [ "$NODE_MAJOR" -eq "$NODE_MAJOR" ] 2>/dev/null; then
  die "Node.js est present mais ne repond pas correctement." \
      "Executable utilise :" \
      "  ${NODE_CHEMIN}" \
      "" \
      "'node -v' a renvoye (code ${NODE_CODE}) :" \
      "  ${NODE_SORTIE:-<aucune sortie>}" \
      "" \
      "Pistes, de la plus probable a la moins probable :" \
      "" \
      "  • ${B}Relancez simplement ce script.${Z} Un premier demarrage bloque par" \
      "    un antivirus se debloque souvent au second essai." \
      "  • Si le chemin ci-dessus est dans un dossier ${B}Anaconda${Z}, il s'agit du" \
      "    Node fourni par Anaconda, qui depend d'un environnement conda actif." \
      "    Installez le Node.js officiel (LTS) depuis ${B}https://nodejs.org${Z} :" \
      "    il ira dans C:\\Program Files\\nodejs et passera en priorite." \
      "  • Sinon, reinstallez Node.js LTS depuis ${B}https://nodejs.org${Z}."
fi

# Vite 5 exige Node 18+ ; les versions 19 et 21 sont des paliers non maintenus.
if [ "$NODE_MAJOR" -lt 18 ]; then
  die "Node.js ${NODE_VERSION} est trop ancien." \
      "Le projet demande la version 18 au minimum (20 ou 22 recommandee)." \
      "" \
      "A faire :" \
      "  1. Telecharger la version LTS sur ${B}https://nodejs.org${Z}" \
      "  2. L'installer par-dessus l'ancienne" \
      "  3. Fermer et rouvrir cette fenetre, puis relancer ce script"
fi
ok "Node ${NODE_VERSION}"

command -v npm >/dev/null 2>&1 || die \
  "npm est introuvable alors que Node.js est installe." \
  "L'installation de Node.js est probablement incomplete." \
  "" \
  "Reinstallez Node.js depuis ${B}https://nodejs.org${Z} en gardant les options par defaut."
ok "npm $(npm -v)"

# ── 3. Dependances ────────────────────────────────────────────────────────────

step "Verification des dependances"

besoin_install=""
if [ ! -d node_modules ]; then
  besoin_install="premiere installation"
elif [ ! -f node_modules/.package-lock.json ]; then
  besoin_install="installation incomplete"
elif [ package-lock.json -nt node_modules/.package-lock.json ]; then
  besoin_install="la liste des dependances a change"
fi

if [ -n "$besoin_install" ]; then
  warn "${besoin_install} — installation en cours"
  printf '%s\n\n' "    ${DIM}(quelques minutes la premiere fois, c'est normal)${Z}"

  if ! npm install --no-fund --no-audit; then
    die "L'installation des dependances a echoue." \
        "Causes les plus frequentes :" \
        "" \
        "  • ${B}Pas de connexion internet${Z} — npm telecharge depuis le reseau." \
        "  • ${B}Un antivirus ou un proxy d'entreprise${Z} bloque les telechargements." \
        "  • ${B}Une installation precedente interrompue${Z} a laisse des fichiers casses." \
        "" \
        "Si le probleme persiste, repartez de zero :" \
        "  ${B}rm -rf node_modules package-lock.json && npm install${Z}"
  fi
  printf '\n'
  ok "dependances installees"
else
  ok "dependances a jour"
fi

# ── 4. Mode API ───────────────────────────────────────────────────────────────

step "Mode API"

# Mode effectif : argument > .env.local > .env > defaut du code (live).
mode_du_fichier() {
  local f
  for f in .env.local .env; do
    if [ -f "$f" ]; then
      local v
      v="$(grep -E '^[[:space:]]*VITE_API_MODE[[:space:]]*=' "$f" | tail -1 | cut -d= -f2- | tr -d ' "'"'"'\r')"
      if [ -n "$v" ]; then printf '%s|%s' "$v" "$f"; return; fi
    fi
  done
  printf 'live|defaut du code'
}

if [ -n "$MODE_FORCE" ]; then
  MODE="$MODE_FORCE"
  MODE_SOURCE=$([ "$APERCU" = "oui" ] && echo "impose par le mode pwa" || echo "demande au lancement")
  export VITE_API_MODE="$MODE_FORCE"
else
  _m="$(mode_du_fichier)"
  MODE="${_m%%|*}"
  MODE_SOURCE="${_m##*|}"
fi

if [ "$MODE" = "mock" ]; then
  ok "mock — donnees de demonstration ${DIM}(${MODE_SOURCE})${Z}"
  printf '%s\n' "    ${DIM}aucun backend requis. Connexion : admin@pnud.org / demo${Z}"
else
  ok "live — backend reel ${DIM}(${MODE_SOURCE})${Z}"
  printf '%s\n' "    ${DIM}une connexion au serveur est necessaire pour se connecter${Z}"
  printf '%s\n' "    ${DIM}pour travailler hors ligne : ./start.sh mock${Z}"
fi

# ── 5. Port ───────────────────────────────────────────────────────────────────

step "Port"

# Point de depart de la recherche. Volontairement hors de la plage 5173-5190,
# ou se bousculent les serveurs Vite des autres projets. 8492 renvoie au
# numero de projet UNDP-MLI-00492.
PORT_BASE="${PASET_PORT:-8492}"

# Un port fige finit toujours par entrer en collision sur un poste qui heberge
# plusieurs projets : on cherche donc le premier libre a partir de la base.
PORT="$(node -e '
  const net = require("net");
  const base = Number(process.argv[1]);
  (function essayer(p, restant) {
    if (!restant) { process.exit(1); }
    const s = net.createServer();
    s.once("error", () => essayer(p + 1, restant - 1));
    s.once("listening", () => s.close(() => { console.log(p); }));
    /* Sans hote : on ecoute sur toutes les interfaces, comme Vite avec
     * host:true. Sonder seulement 127.0.0.1 donnerait un faux libre, Windows
     * acceptant de lier une interface precise alors que 0.0.0.0 est deja pris. */
    s.listen(p);
  })(base, 80);
' "$PORT_BASE" 2>/dev/null)"

if [ -z "$PORT" ]; then
  die "Aucun port libre trouve entre ${PORT_BASE} et $((PORT_BASE + 79))." \
      "C'est tres inhabituel : il reste probablement des serveurs de" \
      "developpement ouverts en arriere-plan." \
      "" \
      "Fermez les fenetres de terminal encore actives, ou imposez un port :" \
      "  ${B}PASET_PORT=9876 ./start.sh${Z}"
fi

export PASET_PORT="$PORT"
if [ "$PORT" = "$PORT_BASE" ]; then
  ok "port ${PORT}"
else
  ok "port ${PORT} ${DIM}(${PORT_BASE} etait occupe)${Z}"
fi

# ── 6. Demarrage ──────────────────────────────────────────────────────────────

ouvrir_navigateur() {
  local url="$1"
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) cmd.exe //c start "" "$url" >/dev/null 2>&1 & ;;
    Darwin)               open "$url"     >/dev/null 2>&1 & ;;
    *)                    xdg-open "$url" >/dev/null 2>&1 & ;;
  esac
}

# L'apercu sert le resultat d'un build : il faut donc le produire d'abord.
if [ "$APERCU" = "oui" ]; then
  printf '\n%s\n' "${C}▸${Z} Build de production"
  printf '%s\n\n' "    ${DIM}necessaire pour que l'application soit installable${Z}"
  if ! npm run build; then
    die "Le build de production a echoue." \
        "Le message d'erreur exact est affiche juste au-dessus." \
        "" \
        "C'est presque toujours une erreur TypeScript : le chemin du fichier" \
        "fautif et le numero de ligne figurent dans le message."
  fi
  printf '\n'
  ok "build termine"
  CIBLE="preview"
else
  CIBLE="dev"
fi

printf '\n%s\n' "${C}▸${Z} Demarrage du serveur"
if [ "$APERCU" = "oui" ]; then
  printf '%s\n' "    ${DIM}l'icone d'installation apparait dans la barre d'adresse${Z}"
fi
printf '%s\n\n' "    ${DIM}pour arreter : Ctrl+C dans cette fenetre${Z}"

# On relaie la sortie de Vite telle quelle, en guettant l'URL locale pour
# ouvrir le navigateur des que le serveur repond.
npm run "$CIBLE" 2>&1 | {
  navigateur_ouvert=""
  while IFS= read -r ligne; do
    printf '%s\n' "$ligne"
    if [ -z "$navigateur_ouvert" ] && [ "$OUVRIR_NAVIGATEUR" = "oui" ]; then
      # Vite colore son URL : on retire les codes ANSI avant de lire le port.
      propre="$(printf '%s' "$ligne" | sed -e 's/\x1b\[[0-9;]*[a-zA-Z]//g')"
      if [[ "$propre" =~ localhost:([0-9]+) ]]; then
        ouvrir_navigateur "http://localhost:${BASH_REMATCH[1]}/"
        navigateur_ouvert="oui"
      fi
    fi
  done
}

CODE_SORTIE="${PIPESTATUS[0]}"

# Ctrl+C (130) est un arret volontaire, pas une erreur.
if [ "$CODE_SORTIE" -ne 0 ] && [ "$CODE_SORTIE" -ne 130 ]; then
  die "Le serveur de developpement s'est arrete de facon inattendue." \
      "Le message d'erreur exact est affiche juste au-dessus." \
      "" \
      "Pistes les plus frequentes :" \
      "" \
      "  • ${B}Erreur de compilation${Z} — une erreur TypeScript ou une faute de frappe" \
      "    dans un fichier recemment modifie. Le chemin du fichier fautif est" \
      "    indique dans le message ci-dessus." \
      "  • ${B}Dependances corrompues${Z} — relancez apres :" \
      "    ${B}rm -rf node_modules && npm install${Z}" \
      "" \
      "${DIM}(code de sortie : ${CODE_SORTIE})${Z}"
fi

printf '\n%s\n' "${G}✓${Z} Serveur arrete."
pause_if_clicked
