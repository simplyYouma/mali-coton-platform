/**
 * Generateur des photos de demonstration — PASET Mali.
 *
 *   node tools/generate-photos.mjs
 *
 * Les fixtures de collecte ne portaient aucune photo (`photos: []`), et
 * public/img/ ne contenait qu'une seule image : galeries et vignettes
 * restaient vides en mode demonstration.
 *
 * Ces visuels sont des substituts assumes, pas des photographies : chacun
 * porte son intitule et la mention « visuel de demonstration ». On voit
 * immediatement de quel type de prise de vue il s'agit, sans faire passer
 * une image de synthese pour une donnee de terrain.
 */

import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = resolve(RACINE, 'public/img/collectes');

const LARGEUR = 800;
const HAUTEUR = 600;

function police(fichier) {
  return readFileSync(
    resolve(RACINE, 'node_modules/@fontsource/inter/files', fichier),
  ).toString('base64');
}
const INTER_600 = police('inter-latin-600-normal.woff2');
const INTER_400 = police('inter-latin-400-normal.woff2');

/**
 * Chaque prise de vue a sa palette et son motif, pour rester reconnaissable
 * en vignette comme en plein ecran.
 *
 *  - `ciel` / `sol` : degrade de fond
 *  - `bandes`       : hauteurs relatives des aplats horizontaux (0 = haut)
 */
const PRISES = [
  {
    fichier: 'pnud-vats-1.jpg',
    titre: 'Cuves de teinture',
    detail: 'Bains indigo — atelier en activité',
    ciel: '#2b2f6b', sol: '#141742',
    bandes: [{ h: 0.55, c: '#33377d' }, { h: 0.78, c: '#1d2057' }],
    accent: '#5c62b8',
  },
  {
    fichier: 'pnud-effluent-2.jpg',
    titre: 'Caniveau de rejet',
    detail: 'Effluent de teinture vers l’extérieur du site',
    ciel: '#1d3a4a', sol: '#0d2430',
    bandes: [{ h: 0.42, c: '#20505e' }, { h: 0.72, c: '#123a44' }],
    accent: '#3f7f8c',
  },
  {
    fichier: 'pnud-workshop-3.jpg',
    titre: "Vue d'ensemble de l'atelier",
    detail: 'Enceinte de la teinturerie',
    ciel: '#b08a55', sol: '#6d5330',
    bandes: [{ h: 0.52, c: '#c39a5f' }, { h: 0.76, c: '#8a6a3d' }],
    accent: '#e0c08a',
  },
  {
    fichier: 'pnud-ppe-4.jpg',
    titre: 'Équipement de protection',
    detail: 'Gants et tablier — poste de teinture',
    ciel: '#3f5aa6', sol: '#a9752f',
    bandes: [{ h: 0.45, c: '#4f6dbd' }, { h: 0.7, c: '#c08e45' }],
    accent: '#dfe6f5',
  },
  {
    fichier: 'pnud-sample-5.jpg',
    titre: 'Étiquette échantillon',
    detail: 'Flacon référencé avant envoi au laboratoire',
    ciel: '#7f8a93', sol: '#4d565e',
    bandes: [{ h: 0.6, c: '#98a2a9' }, { h: 0.8, c: '#69737b' }],
    accent: '#cfd6da',
  },
  {
    fichier: 'pnud-rinse-6.jpg',
    titre: 'Bac de rinçage',
    detail: 'Eau de rinçage en fin de cycle',
    ciel: '#4d7a86', sol: '#2a4c55',
    bandes: [{ h: 0.48, c: '#5d8b8a' }, { h: 0.73, c: '#3b6266' }],
    accent: '#8fb3b0',
  },
  {
    fichier: 'pnud-waste-7.jpg',
    titre: 'Dépôt de déchets',
    detail: 'Boues de teinture et résidus solides',
    ciel: '#5c5148', sol: '#332c26',
    bandes: [{ h: 0.5, c: '#6f6157' }, { h: 0.77, c: '#453b33' }],
    accent: '#a39184',
  },
  {
    fichier: 'pnud-drain-8.jpg',
    titre: 'Point de rejet',
    detail: 'Exutoire vers le milieu récepteur',
    ciel: '#5b93b5', sol: '#2f6685',
    bandes: [{ h: 0.5, c: '#7fb4cf' }, { h: 0.74, c: '#4a86a6' }],
    accent: '#a8d0e4',
  },
];

function page(p) {
  const bandes = p.bandes
    .map(
      (b) =>
        `<div style="position:absolute;left:0;right:0;top:${b.h * 100}%;bottom:0;background:${b.c};"></div>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Inter; font-weight: 600; font-display: block;
      src: url(data:font/woff2;base64,${INTER_600}) format('woff2'); }
    @font-face { font-family: Inter; font-weight: 400; font-display: block;
      src: url(data:font/woff2;base64,${INTER_400}) format('woff2'); }
    html, body { margin: 0; padding: 0; }
    .photo {
      position: relative; overflow: hidden;
      width: ${LARGEUR}px; height: ${HAUTEUR}px;
      font-family: Inter, sans-serif;
      background: linear-gradient(180deg, ${p.ciel} 0%, ${p.sol} 100%);
    }
    /* Grain leger : evite l'aplat parfaitement lisse, qui ne ressemble a rien. */
    .grain {
      position: absolute; inset: 0;
      background-image:
        repeating-linear-gradient(45deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 9px),
        repeating-linear-gradient(-30deg, rgba(0,0,0,0.05) 0 3px, transparent 3px 14px);
    }
    .lueur {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 60% 45% at 28% 22%,
        rgba(255,255,255,0.18) 0%, transparent 70%);
    }
    .cartouche {
      position: absolute; left: 0; right: 0; bottom: 0;
      padding: 26px 30px 24px;
      background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.62) 55%);
      color: #fff;
    }
    .titre  { font-size: 34px; font-weight: 600; letter-spacing: -0.01em; }
    .detail { font-size: 19px; font-weight: 400; opacity: 0.86; margin-top: 6px; }
    .barre  { width: 54px; height: 3px; background: ${p.accent}; margin-bottom: 14px; }
    .mention {
      position: absolute; top: 20px; right: 22px;
      padding: 5px 11px; border-radius: 999px;
      background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.28);
      color: rgba(255,255,255,0.9);
      font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    }
  </style></head><body>
    <div class="photo" id="photo">
      ${bandes}
      <div class="grain"></div>
      <div class="lueur"></div>
      <div class="mention">Visuel de démonstration</div>
      <div class="cartouche">
        <div class="barre"></div>
        <div class="titre">${p.titre}</div>
        <div class="detail">${p.detail}</div>
      </div>
    </div>
  </body></html>`;
}

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
  console.error('Aucun navigateur disponible (Edge ou Chrome requis).');
  process.exit(1);
}

mkdirSync(SORTIE, { recursive: true });
const contexte = await navigateur.newContext({
  viewport: { width: LARGEUR, height: HAUTEUR },
});

for (const p of PRISES) {
  const page_ = await contexte.newPage();
  await page_.setContent(page(p), { waitUntil: 'load' });
  await page_.evaluate(() => document.fonts.ready);
  const image = await page_.locator('#photo').screenshot({ type: 'jpeg', quality: 82 });
  writeFileSync(resolve(SORTIE, p.fichier), image);
  console.log(`  ✓ ${p.fichier.padEnd(28)} ${Math.round(image.length / 1024)} Ko`);
  await page_.close();
}

await navigateur.close();
console.log(`\n${PRISES.length} visuels ecrits dans public/img/collectes/`);
