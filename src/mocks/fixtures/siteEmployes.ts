/**
 * Effectifs d'un site — onglet « Employés » de la fiche site.
 *
 * `fetchSiteEmployes` renvoyait `{ totalEmployes: 0, employes: [] }` hors mode
 * live, et aucun handler mock ne servait `/site_teintures/:id/employes` :
 * l'onglet restait vide sur les cinq sites.
 *
 * Les champs suivent `Employe` et `DerniereCollecteEmploye` de
 * `src/features/sites/api/siteEmployes.ts`, eux-mêmes alignés sur le schéma
 * du backend. Les effectifs affichés (total, femmes, hommes) sont dérivés de
 * `mockSites`, pour concorder avec les cartes du haut de la fiche.
 *
 * Seul un échantillon d'employés est détaillé par site — jusqu'à douze —
 * comme le ferait une collecte terrain qui n'interroge pas l'ensemble du
 * personnel. `totalEmployes` reste l'effectif réel du site.
 */

import type {
  Employe,
  EmployeCodedItem,
  SiteEmployesResponse,
} from '@/features/sites/api/siteEmployes';
import { mockSites } from './sites';
import { numeroDeSite } from './siteTerrain';

/* ── Générateur déterministe ────────────────────────────────────────────────
 * Même raison que pour les collectes : sans graine fixe, chaque rechargement
 * produirait un effectif différent et rendrait tout test incomparable. */
function creerAlea(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const PRENOMS_F = [
  'Aminata', 'Fatoumata', 'Kadiatou', 'Mariam', 'Oumou', 'Salimata',
  'Djeneba', 'Assitan', 'Rokia', 'Bintou', 'Sitan', 'Nana',
];
const PRENOMS_H = ['Modibo', 'Bakary', 'Seydou', 'Adama', 'Lassine', 'Boubacar'];
const NOMS = [
  'Traoré', 'Keïta', 'Coulibaly', 'Diarra', 'Sissoko', 'Konaté',
  'Sangaré', 'Doumbia', 'Cissé', 'Camara',
];

const FONCTIONS_F = ['Teinturière', 'Rinçeuse', 'Sécheuse', 'Responsable de cuve'];
const FONCTIONS_H = ['Manutentionnaire', 'Gardien', 'Livreur'];

const ANCIENNETES = ['Moins d’un an', '1 à 3 ans', '3 à 5 ans', 'Plus de 5 ans'];
const INSTRUCTION = ['Aucune', 'Alphabétisation', 'Primaire', 'Secondaire'];
const CONTRATS = ['Verbal', 'Écrit', 'Journalier', 'Membre de l’association'];
const MATRIMONIAL = ['Mariée', 'Célibataire', 'Veuve', 'Divorcée'];
const TRANCHES_AGE = ['18-25 ans', '26-35 ans', '36-45 ans', '46-55 ans', 'Plus de 55 ans'];

const EPI_POSSIBLES = ['Gants', 'Tablier', 'Bottes', 'Masque'];
const AFFECTIONS = [
  'Irritations cutanées des mains',
  'Toux persistante',
  'Irritations oculaires',
  'Douleurs lombaires',
];
const BESOINS = [
  'Équipements de protection',
  'Suivi médical régulier',
  'Formation aux risques chimiques',
  'Amélioration du poste de travail',
  'Appui financier',
];

function tirer<T>(liste: T[], alea: () => number): T {
  return liste[Math.floor(alea() * liste.length)]!;
}

function codes(
  libelles: string[],
  base: number,
  collecteEmployeId: number,
): EmployeCodedItem[] {
  return libelles.map((libelle, idx) => ({
    id: base + idx,
    code: libelle
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z]+/g, '_')
      .slice(0, 24),
    libelle,
    collecteEmployeId,
  }));
}

const MS_JOUR = 86_400_000;

function construireEmployes(siteId: string): Employe[] {
  const site = mockSites.find((s) => s.id === siteId);
  const numero = numeroDeSite(siteId);
  if (!site || numero === undefined) return [];

  const alea = creerAlea(492 + numero * 17);

  /* Échantillon interrogé : au plus douze personnes, en conservant la
   * proportion femmes / hommes réelle du site. */
  const echantillon = Math.min(12, site.workforce);
  const partFemmes = site.workforce > 0 ? (site.workforceWomen ?? site.workforce) / site.workforce : 1;
  const nbFemmes = Math.max(1, Math.round(echantillon * partFemmes));

  return Array.from({ length: echantillon }, (_, idx) => {
    const estFemme = idx < nbFemmes;
    const prenom = tirer(estFemme ? PRENOMS_F : PRENOMS_H, alea);
    const nom = tirer(NOMS, alea);
    const employeId = numero * 1000 + idx + 1;
    const collecteId = numero * 1000 + 500 + idx;

    const epis = EPI_POSSIBLES.filter(() => alea() < (site.id === 'site-djiguiyaso' ? 0.8 : 0.35));
    const affections = AFFECTIONS.filter(() => alea() < 0.3);
    const besoins = BESOINS.filter(() => alea() < 0.4);

    return {
      id: employeId,
      codeEmploye: `EMP-${site.codeSite}-${String(idx + 1).padStart(3, '0')}`,
      numeroEmploye: String(idx + 1),
      genre: estFemme ? 'Féminin' : 'Masculin',
      fonction: tirer(estFemme ? FONCTIONS_F : FONCTIONS_H, alea),
      statut: alea() < 0.75 ? 'Actif' : 'Saisonnier',
      anciennete: tirer(ANCIENNETES, alea),
      niveauInstruction: tirer(INSTRUCTION, alea),
      typeContrat: tirer(CONTRATS, alea),
      situationMatrimoniale: estFemme ? tirer(MATRIMONIAL, alea) : 'Marié',
      siteTeintureId: numero,
      derniereCollecte: {
        id: collecteId,
        dateCollecte: new Date(Date.now() - (14 + numero * 9) * MS_JOUR).toISOString(),
        agent: numero === 5 ? 'Issa Traoré' : 'Aïcha Touré',
        trancheAge: tirer(TRANCHES_AGE, alea),
        eauSuffisante: alea() < 0.7 ? 'Oui' : 'Non',
        qualiteEau: tirer(['Bonne', 'Moyenne', 'Mauvaise'], alea),
        typesEpiUtilises: epis.join(', ') || 'Aucun',
        frequenceEpi: epis.length ? tirer(['Toujours', 'Souvent', 'Rarement'], alea) : 'Jamais',
        obstaclesEpi: epis.length ? '' : 'Non fournis par le site',
        qualiteEpiPercue: epis.length ? tirer(['Correcte', 'Insuffisante'], alea) : 'Sans objet',
        affecDermato: affections.includes('Irritations cutanées des mains') ? 'Oui' : 'Non',
        affecRespi: affections.includes('Toux persistante') ? 'Oui' : 'Non',
        affecOculaire: affections.includes('Irritations oculaires') ? 'Oui' : 'Non',
        bilanSanteRecu: alea() < 0.25 ? 'Oui' : 'Non',
        suiviMedical: alea() < 0.2 ? 'Oui' : 'Non',
        structureSante: alea() < 0.2 ? 'CSCOM du quartier' : '',
        obsSante: affections.length ? affections.join(' ; ') : '',
        expositions: 'Colorants, soude caustique, eau de rinçage',
        confortPoste: tirer(['Correct', 'Pénible', 'Très pénible'], alea),
        accidentsPersonnels: alea() < 0.15 ? 'Oui' : 'Non',
        connaissanceRisques: tirer(['Bonne', 'Partielle', 'Faible'], alea),
        formationSecuRecue: alea() < 0.3 ? 'Oui' : 'Non',
        modeRemuneration: tirer(['À la pièce', 'Journalier', 'Mensuel'], alea),
        revenuSuffisant: alea() < 0.35 ? 'Oui' : 'Non',
        revenuUnique: alea() < 0.6 ? 'Oui' : 'Non',
        couvertureSociale: site.id === 'site-djiguiyaso' || site.id === 'site-ndomo',
        besoinsPrioritaires: besoins.join(', '),
        suggestionsEmploye: '',
        observations: '',
      },
      equipementsProtection: codes(epis, employeId * 10, collecteId),
      santeSecurite: codes(affections, employeId * 10 + 100, collecteId),
      besoins: codes(besoins, employeId * 10 + 200, collecteId),
      photos: [],
      // Champs d'identite reconstitues pour l'affichage en liste.
      nom,
      prenom,
    } as Employe;
  });
}

/** Réponse `/site_teintures/:id/employes` pour un site donné. */
export function employesDuSite(siteId: string): SiteEmployesResponse {
  const site = mockSites.find((s) => s.id === siteId);
  return {
    totalEmployes: site?.workforce ?? 0,
    employes: construireEmployes(siteId),
  };
}
