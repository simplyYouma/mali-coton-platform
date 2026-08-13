/**
 * Fiche terrain d'un site — `CollecteSite` et ses listes codées.
 *
 * Les onglets « Profil du site », « Conditions de travail » et « Appuis &
 * Besoins » restaient vides en mode démonstration : `fetchSiteDetail`
 * renvoyait `null` hors mode live, et aucun handler mock ne servait cette
 * ressource. L'écran affichait « La fiche terrain pour ce site n'a pas encore
 * été importée » sur les cinq sites.
 *
 * Les champs suivent le schéma OpenAPI publié par le backend
 * (`CollecteSite.jsonld-collecte_site.read`, 54 champs métier), recoupé avec
 * `CollecteSiteBackend` de `sites.adapter.ts` — les deux coïncident. Les
 * valeurs numériques sont dérivées de `mockSites` pour qu'effectifs et
 * chiffres concordent d'un écran à l'autre.
 */

import type {
  CollecteSiteBackend,
  KoboCodedItem,
  KoboPhotoBackend,
  SiteTeintureDetailBackend,
} from '@/features/sites/api/sites.adapter';
import { mockSites } from './sites';

/** Un identifiant numérique stable par site, comme en base. */
const ID_NUMERIQUE: Record<string, number> = {
  'site-atpek': 1,
  'site-dianeguela': 2,
  'site-galanimassiriw': 3,
  'site-djiguiyaso': 4,
  'site-ndomo': 5,
};

interface Specifique {
  agent: string;
  sourceEau: string;
  etatSourcePrincipale: string;
  consommationEauM3: number;
  observationsEau: string;
  etatGeneralEquipements: string;
  observationsEquipements: string;
  qualiteEpi: string;
  formationEpiRecue: boolean;
  observationsEpiSite: string;
  cloture: string;
  eclairage: string;
  surveillance: string;
  accidentsRecents: string;
  descriptionAccidents: string;
  observationsSecurite: string;
  comptabilite: string;
  couvertureSociale: string;
  formationsAutre: string;
  observationsGenerales: string;
  recommandations: string;
  typesTeinture: string[];
  equipements: string[];
  epis: string[];
  risques: string[];
  formations: string[];
  appuis: string[];
  besoins: string[];
}

const SPECIFIQUES: Record<string, Specifique> = {
  'site-atpek': {
    agent: 'Aïcha Touré',
    sourceEau: 'Robinet (réseau SOMAGEP)',
    etatSourcePrincipale: 'Fonctionnelle',
    consommationEauM3: 42,
    observationsEau:
      "Approvisionnement stable par le réseau. Aucun dispositif de traitement des eaux usées : "
      + 'rejet direct au caniveau municipal après décantation sommaire en bassin non étanche.',
    etatGeneralEquipements: 'Correct',
    observationsEquipements:
      'Cuves béton en bon état, remplacées en 2023. Aire de séchage couverte insuffisante en saison des pluies.',
    qualiteEpi: 'Moyenne',
    formationEpiRecue: true,
    observationsEpiSite:
      "Gants et tabliers fournis par l'association, renouvellement irrégulier faute de budget dédié. "
      + 'Masques absents alors que les poudres de colorant sont manipulées à sec.',
    cloture: 'Oui — mur en banco',
    eclairage: 'Oui — partiel',
    surveillance: 'Oui — gardien de nuit',
    accidentsRecents: 'Oui',
    descriptionAccidents:
      'Deux brûlures chimiques légères aux avant-bras en mars, lors du transvasement de soude caustique.',
    observationsSecurite:
      "Absence de douche de sécurité et de rince-œil malgré la manipulation de bases fortes. "
      + 'Point signalé au responsable, non résolu à ce jour.',
    comptabilite: 'Tenue par un trésorier bénévole',
    couvertureSociale: 'Aucune',
    formationsAutre: 'Gestion associative (2022, appui PNUD)',
    observationsGenerales:
      "Site le plus structuré du panel, avec une gouvernance associative claire. C'est aussi celui "
      + "dont le volume de rejets est le plus élevé, faute d'installation de traitement.",
    recommandations:
      "Prioriser l'installation d'un système de prétraitement des effluents (dégrillage + neutralisation du pH) "
      + 'et doter le site de masques FFP2 pour la manipulation des poudres.',
    typesTeinture: ['GALA', 'INDIGO'],
    equipements: ['Cuves béton', 'Bassin de décantation', 'Aire de séchage', 'Fûts de stockage'],
    epis: ['Gants', 'Tabliers', 'Bottes'],
    risques: ['Brûlures chimiques', 'Chutes de plain-pied', 'Inhalation de poudres'],
    formations: ['Manipulation des colorants', 'Premiers secours'],
    appuis: ['Appui financier PNUD', 'Formation technique'],
    besoins: ['Station de traitement des eaux', 'Équipements de protection', 'Formation continue'],
  },
  'site-dianeguela': {
    agent: 'Aïcha Touré',
    sourceEau: 'Puits busé',
    etatSourcePrincipale: 'Fonctionnelle mais turbide',
    consommationEauM3: 28,
    observationsEau:
      'Effluents rejetés sans aucun traitement dans le caniveau longeant le site, lui-même connecté '
      + "au collecteur du quartier. pH mesuré à 11,25 et sulfates à 4 332 mg/L — très au-delà des normes.",
    etatGeneralEquipements: 'Vétuste',
    observationsEquipements:
      'Cuves métalliques corrodées, deux fuites actives constatées. Aucune aire de séchage aménagée.',
    qualiteEpi: 'Insuffisante',
    formationEpiRecue: false,
    observationsEpiSite:
      "Aucun équipement de protection fourni par le site. Les teinturières utilisent des gants ménagers "
      + 'achetés à titre personnel, remplacés lorsqu’ils se percent.',
    cloture: 'Non',
    eclairage: 'Non',
    surveillance: 'Non',
    accidentsRecents: 'Oui',
    descriptionAccidents:
      'Projection de bain de teinture dans les yeux d’une artisane en février, sans séquelle rapportée. '
      + 'Aucun rince-œil disponible sur place.',
    observationsSecurite:
      'Site ouvert sur la voie publique, enfants présents pendant les opérations de teinture. '
      + 'Risque d’exposition des tiers non maîtrisé.',
    comptabilite: 'Aucune',
    couvertureSociale: 'Aucune',
    formationsAutre: 'Aucune',
    observationsGenerales:
      'Cas le plus critique du panel sur le plan environnemental comme sanitaire. Cumul : absence de '
      + 'traitement, équipements dégradés, aucune protection individuelle, site non clôturé.',
    recommandations:
      "Intervention prioritaire. Clôturer le site, fournir des EPI en urgence, installer un bac de "
      + "neutralisation avant rejet, et engager une formation aux risques chimiques.",
    typesTeinture: ['GALA'],
    equipements: ['Cuves métalliques', 'Fûts de stockage'],
    epis: ['Gants (personnels)'],
    risques: [
      'Brûlures chimiques',
      'Projections oculaires',
      'Exposition de tiers',
      'Contamination du sol',
    ],
    formations: [],
    appuis: [],
    besoins: [
      'Équipements de protection',
      'Clôture du site',
      'Traitement des effluents',
      'Formation aux risques chimiques',
    ],
  },
  'site-galanimassiriw': {
    agent: 'Aïcha Touré',
    sourceEau: 'Borne-fontaine partagée',
    etatSourcePrincipale: 'Fonctionnelle',
    consommationEauM3: 9,
    observationsEau:
      "Approvisionnement par bidons depuis une borne-fontaine à 120 m. Consommation contrainte par "
      + 'le transport manuel. Rejets épandus à même le sol en fond de parcelle.',
    etatGeneralEquipements: 'Sommaire',
    observationsEquipements:
      'Bassines plastiques et fûts récupérés. Aucun équipement fixe. Séchage à même le sol sur bâche.',
    qualiteEpi: 'Insuffisante',
    formationEpiRecue: false,
    observationsEpiSite:
      "Absence d'EPI documentée chez la majorité des artisanes. Manipulation à mains nues observée "
      + 'lors de la visite.',
    cloture: 'Non — clôture partielle',
    eclairage: 'Non',
    surveillance: 'Non',
    accidentsRecents: 'Non',
    descriptionAccidents: '',
    observationsSecurite:
      'Petite structure, faible volume manipulé, mais exposition individuelle élevée faute de protection.',
    comptabilite: 'Cahier manuscrit',
    couvertureSociale: 'Aucune',
    formationsAutre: 'Aucune',
    observationsGenerales:
      "Petit centre informel de 20 personnes. L'impact environnemental global reste limité par le "
      + "volume, mais l'exposition individuelle des artisanes est la plus élevée du panel.",
    recommandations:
      'Doter le site en EPI de base et sensibiliser aux bonnes pratiques de manipulation. '
      + "Aménager une zone de rejet isolée pour éviter l'épandage direct sur le sol.",
    typesTeinture: ['GALA'],
    equipements: ['Bassines plastiques', 'Fûts de récupération'],
    epis: [],
    risques: ['Contact cutané prolongé', 'Contamination du sol'],
    formations: [],
    appuis: [],
    besoins: ['Équipements de protection', 'Sensibilisation', 'Aménagement de la zone de rejet'],
  },
  'site-djiguiyaso': {
    agent: 'Aïcha Touré',
    sourceEau: 'Forage privé',
    etatSourcePrincipale: 'Fonctionnelle',
    consommationEauM3: 24,
    observationsEau:
      "Forage dédié, débit suffisant. Bassin de décantation en place, vidangé tous les deux mois. "
      + "Teinture à l'indigo naturel : charge chimique nettement inférieure aux ateliers GALA.",
    etatGeneralEquipements: 'Bon',
    observationsEquipements:
      'Cuves en terre cuite traditionnelles entretenues, aire de séchage couverte, atelier ventilé.',
    qualiteEpi: 'Correcte',
    formationEpiRecue: true,
    observationsEpiSite:
      'Gants et tabliers fournis et renouvelés par la coopérative. Port effectif constaté lors de la visite.',
    cloture: 'Oui — grillage',
    eclairage: 'Oui — complet',
    surveillance: 'Oui — gardien permanent',
    accidentsRecents: 'Non',
    descriptionAccidents: '',
    observationsSecurite:
      'Site le mieux tenu du panel sur le volet sécurité. Extincteur présent et contrôlé.',
    comptabilite: 'Comptable salarié',
    couvertureSociale: 'Mutuelle coopérative',
    formationsAutre: 'Gestion coopérative, teinture naturelle',
    observationsGenerales:
      "Coopérative structurée, pratiques traditionnelles à base d'Indigofera. Sert de référence "
      + 'de bonnes pratiques pour les autres sites du panel.',
    recommandations:
      "Documenter les pratiques de ce site pour en faire un support de formation destiné aux "
      + 'ateliers informels du panel.',
    typesTeinture: ['INDIGO'],
    equipements: [
      'Cuves en terre cuite',
      'Bassin de décantation',
      'Aire de séchage couverte',
      'Extincteur',
    ],
    epis: ['Gants', 'Tabliers', 'Bottes', 'Masques'],
    risques: ['Contact cutané'],
    formations: ['Teinture naturelle', 'Gestion coopérative', 'Premiers secours'],
    appuis: ['Appui financier PNUD', 'Accompagnement technique', 'Formation'],
    besoins: ['Extension de l’aire de séchage', 'Appui à la commercialisation'],
  },
  'site-ndomo': {
    agent: 'Issa Traoré',
    sourceEau: 'Fleuve Niger (pompage)',
    etatSourcePrincipale: 'Fonctionnelle',
    consommationEauM3: 18,
    observationsEau:
      'Teintures exclusivement végétales (bogolan). Effluents chargés en matière organique mais '
      + 'sans intrant chimique de synthèse. Épandage contrôlé sur parcelle dédiée.',
    etatGeneralEquipements: 'Bon',
    observationsEquipements:
      'Atelier démonstratif entretenu, cuves traditionnelles, aire de séchage aménagée.',
    qualiteEpi: 'Correcte',
    formationEpiRecue: true,
    observationsEpiSite:
      'Protection adaptée à des procédés végétaux. Risque chimique faible par nature du procédé.',
    cloture: 'Oui — mur',
    eclairage: 'Oui — complet',
    surveillance: 'Oui — gardien permanent',
    accidentsRecents: 'Non',
    descriptionAccidents: '',
    observationsSecurite: 'Aucun incident rapporté. Site également ouvert au public (visites).',
    comptabilite: 'Comptabilité formelle',
    couvertureSociale: 'Salariés déclarés',
    formationsAutre: 'Transmission du bogolan, accueil de visiteurs',
    observationsGenerales:
      'Site de référence du panel : procédés naturels, gestion formelle, impact environnemental '
      + 'le plus faible. Sert de témoin pour la comparaison des indicateurs.',
    recommandations:
      'Maintenir le suivi à titre de référence. Valoriser le site comme vitrine des procédés '
      + 'à faible impact auprès des bailleurs.',
    typesTeinture: ['NATURELLE'],
    equipements: ['Cuves traditionnelles', 'Aire de séchage', 'Atelier couvert'],
    epis: ['Gants', 'Tabliers'],
    risques: [],
    formations: ['Teinture végétale', 'Accueil du public'],
    appuis: ['Appui financier PNUD', 'Reconnaissance patrimoniale'],
    besoins: ['Appui à la commercialisation'],
  },
};

/** Construit une liste codée (types de teinture, EPI, risques…). */
function listeCodee(
  prefixe: string,
  libelles: string[],
  siteId: number,
  collecteSiteId: number,
): KoboCodedItem[] {
  return libelles.map((libelle, idx) => ({
    id: siteId * 100 + idx,
    siteTeintureId: siteId,
    collecteSiteId,
    code: `${prefixe}_${idx + 1}`,
    libelle,
  }));
}

/** Photos rattachées à la fiche terrain — les mêmes visuels que les collectes. */
function photosFiche(siteId: number, collecteSiteId: number): KoboPhotoBackend[] {
  const prises = [
    { xpath: 'photo_site_1', fichier: 'pnud-workshop-3', legende: "Vue d'ensemble du site" },
    { xpath: 'photo_site_2', fichier: 'pnud-vats-1', legende: 'Cuves de teinture' },
    { xpath: 'photo_equipements', fichier: 'pnud-rinse-6', legende: 'Bac de rinçage' },
    { xpath: 'photo_epi', fichier: 'pnud-ppe-4', legende: 'Équipement de protection' },
    { xpath: 'photo_securite', fichier: 'pnud-drain-8', legende: 'Point de rejet' },
  ];
  return prises.map((p, idx) => ({
    id: siteId * 100 + 50 + idx,
    siteTeintureId: siteId,
    collecteSiteId,
    questionXpath: p.xpath,
    mediaFileBasename: `${p.fichier}.jpg`,
    mimeType: 'image/jpeg',
    url: `/img/collectes/${p.fichier}.jpg`,
    libelle: p.legende,
  })) as KoboPhotoBackend[];
}

const MS_JOUR = 86_400_000;

/**
 * Fiche terrain complète d'un site, prête à être fusionnée dans la réponse
 * `/sites/:id` du mock. Renvoie `null` pour un site inconnu.
 */
export function ficheTerrain(
  siteId: string,
): Pick<
  SiteTeintureDetailBackend,
  | 'collecteSite'
  | 'typesTeinture'
  | 'equipements'
  | 'epis'
  | 'risquesSecurite'
  | 'formationsRecues'
  | 'appuisRecus'
  | 'besoinsPrioritaires'
  | 'photos'
> | null {
  const site = mockSites.find((s) => s.id === siteId);
  const spec = SPECIFIQUES[siteId];
  const numero = ID_NUMERIQUE[siteId];
  if (!site || !spec || numero === undefined) return null;

  const collecteSiteId = 1000 + numero;
  // Visite espacée par site, pour que les dates ne soient pas toutes identiques.
  const dateVisite = new Date(Date.now() - (12 + numero * 9) * MS_JOUR).toISOString();

  const collecteSite: CollecteSiteBackend = {
    id: collecteSiteId,
    koboSubmissionId: `${480_000 + numero}`,
    koboUuid: `f1e2d3c4-${String(numero).padStart(4, '0')}-4a5b-9c6d-7e8f9a0b1c2d`,
    koboFormUid: 'aXbYcZ1234567890',
    idSiteKobo: site.codeSite,
    dateVisite,
    siteCode: site.codeSite,
    ville: site.location.city,
    agent: spec.agent,
    gpsSiteRaw: `${site.coordinates.lat} ${site.coordinates.lng} 0 5`,
    latitude: site.coordinates.lat,
    longitude: site.coordinates.lng,
    nomResponsable: site.responsableName,
    genreResponsable: 'Féminin',
    anneeCreation: site.createdYear,
    statutJuridique: site.niveauFormalisation,
    typesTeinture: spec.typesTeinture.join(', '),
    nbEmployesTotal: site.workforce,
    nbFemmes: site.workforceWomen,
    nbHommes: site.workforceMen,
    sourceEau: spec.sourceEau,
    etatSourcePrincipale: spec.etatSourcePrincipale,
    consommationEauM3: spec.consommationEauM3,
    observationsEau: spec.observationsEau,
    equipementsDisponibles: spec.equipements.join(', '),
    etatGeneralEquipements: spec.etatGeneralEquipements,
    observationsEquipements: spec.observationsEquipements,
    epiDisponibles: spec.epis.join(', '),
    qualiteEpi: spec.qualiteEpi,
    formationEpiRecue: spec.formationEpiRecue,
    observationsEpiSite: spec.observationsEpiSite,
    cloture: spec.cloture,
    eclairage: spec.eclairage,
    surveillance: spec.surveillance,
    risquesSecurite: spec.risques.join(', '),
    accidentsRecents: spec.accidentsRecents,
    descriptionAccidents: spec.descriptionAccidents,
    observationsSecurite: spec.observationsSecurite,
    comptabilite: spec.comptabilite,
    couvertureSociale: spec.couvertureSociale,
    formationsRecues: spec.formations.join(', '),
    formationsAutre: spec.formationsAutre,
    appuisRecus: spec.appuis.join(', '),
    besoinsPrioritaires: spec.besoins.join(', '),
    observationsGenerales: spec.observationsGenerales,
    recommandations: spec.recommandations,
    photoSite1: '/img/collectes/pnud-workshop-3.jpg',
    photoSite2: '/img/collectes/pnud-vats-1.jpg',
    photoEquipements: '/img/collectes/pnud-rinse-6.jpg',
    photoEpi: '/img/collectes/pnud-ppe-4.jpg',
    photoSecurite: '/img/collectes/pnud-drain-8.jpg',
    statutImport: 'importe',
    createdAt: dateVisite,
    updatedAt: dateVisite,
  };

  return {
    collecteSite,
    typesTeinture: listeCodee('TEINT', spec.typesTeinture, numero, collecteSiteId),
    equipements: listeCodee('EQUIP', spec.equipements, numero, collecteSiteId),
    epis: listeCodee('EPI', spec.epis, numero, collecteSiteId),
    risquesSecurite: listeCodee('RISQ', spec.risques, numero, collecteSiteId),
    formationsRecues: listeCodee('FORM', spec.formations, numero, collecteSiteId),
    appuisRecus: listeCodee('APPUI', spec.appuis, numero, collecteSiteId),
    besoinsPrioritaires: listeCodee('BESOIN', spec.besoins, numero, collecteSiteId),
    photos: photosFiche(numero, collecteSiteId),
  };
}

/** Identifiant numérique de site — partagé avec la fixture des employés. */
export function numeroDeSite(siteId: string): number | undefined {
  return ID_NUMERIQUE[siteId];
}
