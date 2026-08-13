/**
 * Generateur des icones PWA — PASET Mali.
 *
 *   node tools/generate-icons.mjs
 *
 * Reproduit l'identite de l'ecran de connexion : bleu de la charte, degrade
 * vertical vers le bleu fonce, halo blanc en haut a gauche, rayures a 45°,
 * et le wordmark PASET / MALI.
 *
 * Le rendu passe par un navigateur (Playwright) plutot que par une image
 * figee : la charte reste la seule source de verite, et regenerer les icones
 * apres un changement de couleur ou de typographie se fait en une commande.
 */

import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = resolve(RACINE, 'public/icons');

/* ── Charte (src/styles/tokens.css + LoginPage.module.css) ─────────────────── */

const PRIMAIRE        = '#0468b1'; // --color-primary
const PRIMAIRE_SURVOL = '#035a9c'; // --color-primary-hover
const PRIMAIRE_ACTIF  = '#034d85'; // --color-primary-active

/** Cote de reference du rendu ; toutes les tailles en sont des homotheties. */
const BASE = 512;

function police(fichier) {
  const chemin = resolve(RACINE, 'node_modules/@fontsource/inter/files', fichier);
  return readFileSync(chemin).toString('base64');
}

const INTER_800 = police('inter-latin-800-normal.woff2');
const INTER_300 = police('inter-latin-300-normal.woff2');

/**
 * @param {object} o
 * @param {number} o.rayon       arrondi des angles, en px sur la base 512
 * @param {number} o.largeurTexte part de la largeur occupee par le wordmark
 */
function page({ rayon, largeurTexte }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Inter; font-weight: 800; font-display: block;
      src: url(data:font/woff2;base64,${INTER_800}) format('woff2'); }
    @font-face { font-family: Inter; font-weight: 300; font-display: block;
      src: url(data:font/woff2;base64,${INTER_300}) format('woff2'); }

    html, body { margin: 0; padding: 0; background: transparent; }

    .icone {
      width: ${BASE}px; height: ${BASE}px;
      position: relative; overflow: hidden;
      border-radius: ${rayon}px;
      display: flex; align-items: center; justify-content: center;
      background-color: ${PRIMAIRE};
      /* Halo blanc en haut a gauche + descente vers le bleu fonce, comme le
       * panneau visuel de l'ecran de connexion. */
      background-image:
        radial-gradient(ellipse 70% 60% at 20% 25%, rgba(255,255,255,0.16) 0%, transparent 70%),
        linear-gradient(180deg, ${PRIMAIRE} 0%, ${PRIMAIRE} 32%, ${PRIMAIRE_SURVOL} 70%, ${PRIMAIRE_ACTIF} 100%);
    }
    /* Rayures a 45°, epaissies par rapport a l'ecran : a la taille d'une
     * icone, le 1px d'origine disparaitrait au rendu. */
    .icone::before {
      content: ''; position: absolute; inset: 0;
      background-image: repeating-linear-gradient(45deg,
        rgba(255,255,255,0.09) 0 2px, transparent 2px 30px);
    }

    .wordmark {
      position: relative;
      display: flex; flex-direction: column; align-items: center;
      line-height: 1; font-family: Inter, sans-serif;
      transform-origin: center;
    }
    /* Les marges negatives compensent l'espacement de la derniere lettre,
     * qui decentrerait le bloc vers la gauche. */
    .haut {
      font-size: 100px; font-weight: 800; letter-spacing: 0.08em;
      color: #ffffff; margin-right: -0.08em;
    }
    .bas {
      font-size: 62px; font-weight: 300; letter-spacing: 0.32em;
      color: rgba(255,255,255,0.82); margin-right: -0.32em;
      margin-top: 20px; text-transform: uppercase;
    }
  </style></head><body>
    <div class="icone" id="icone">
      <div class="wordmark" id="wordmark">
        <span class="haut">PASET</span>
        <span class="bas">MALI</span>
      </div>
    </div>
  </body></html>`;
}

/* ── Declinaisons ──────────────────────────────────────────────────────────── */

const VARIANTES = [
  // Icones classiques : l'arrondi est dessine dans l'image.
  { fichier: 'icon-192.png',          taille: 192, rayon: 112, largeurTexte: 0.68 },
  { fichier: 'icon-512.png',          taille: 512, rayon: 112, largeurTexte: 0.68 },
  { fichier: 'favicon-32.png',        taille: 32,  rayon: 112, largeurTexte: 0.72 },
  { fichier: 'favicon-16.png',        taille: 16,  rayon: 112, largeurTexte: 0.76 },

  // Maskable : le systeme applique lui-meme sa decoupe. On remplit donc tout
  // le carre et on garde le wordmark dans la zone sure (80% centraux).
  { fichier: 'icon-maskable-512.png', taille: 512, rayon: 0,   largeurTexte: 0.54 },

  // iOS arrondit deja l'icone d'accueil : un arrondi dessine en plus
  // laisserait des coins blancs visibles.
  { fichier: 'apple-touch-icon.png',  taille: 180, rayon: 0,   largeurTexte: 0.64 },
];

/* ── Rendu ─────────────────────────────────────────────────────────────────── */

let navigateur;
for (const canal of ['msedge', 'chrome']) {
  try {
    navigateur = await chromium.launch({ channel: canal });
    break;
  } catch {
    /* essaie le suivant */
  }
}
if (!navigateur) {
  navigateur = await chromium.launch().catch(() => null);
}
if (!navigateur) {
  console.error(
    "Aucun navigateur disponible.\n" +
      "Installez Edge ou Chrome, ou executez : npx playwright install chromium",
  );
  process.exit(1);
}

mkdirSync(SORTIE, { recursive: true });

for (const v of VARIANTES) {
  const contexte = await navigateur.newContext({
    viewport: { width: BASE, height: BASE },
    deviceScaleFactor: v.taille / BASE,
  });
  const p = await contexte.newPage();
  await p.setContent(page(v), { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);

  // Le wordmark est mis a l'echelle apres mesure : on ne depend pas des
  // metriques exactes de la police pour qu'il tienne dans le carre.
  await p.evaluate(
    ({ base, part }) => {
      const w = document.getElementById('wordmark');
      const largeur = w.getBoundingClientRect().width;
      w.style.transform = `scale(${(base * part) / largeur})`;
    },
    { base: BASE, part: v.largeurTexte },
  );

  const png = await p.locator('#icone').screenshot({ omitBackground: true });
  writeFileSync(resolve(SORTIE, v.fichier), png);
  console.log(`  ✓ ${v.fichier.padEnd(24)} ${v.taille}×${v.taille}`);

  await contexte.close();
}

await navigateur.close();
console.log(`\nIcones ecrites dans public/icons/`);
