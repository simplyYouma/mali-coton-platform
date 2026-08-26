/**
 * Collecte Native — schéma de formulaire publié.
 *
 * Reflète exactement ce que renvoie `GET /api/formulaires-publies/{code}`.
 * Distinct de l'ancien modèle API Platform (`formulaires.types.ts`) : ici les
 * réponses sont indexées par **code de champ** (`"grp_a/id_site"`), jamais par
 * id numérique, et le schéma arrive imbriqué (formulaire → sections → champs).
 */

export type TypeChampNatif =
  | 'TEXTE'
  | 'TEXTE_LONG'
  | 'ENTIER'
  | 'DECIMAL'
  | 'DATE'
  | 'CHOIX_SIMPLE'
  | 'CHOIX_MULTIPLE'
  | 'GEOPOINT'
  | 'FICHIER';

export const TYPES_CHAMP_NATIF: TypeChampNatif[] = [
  'TEXTE', 'TEXTE_LONG', 'ENTIER', 'DECIMAL', 'DATE',
  'CHOIX_SIMPLE', 'CHOIX_MULTIPLE', 'GEOPOINT', 'FICHIER',
];

export interface OptionChamp {
  value: string;
  label: string;
}

/** Liste d'options servie par une ressource distante plutôt que figée dans le schéma. */
export interface OptionsSource {
  mode: 'reference';
  resource: string;
  endpoint: string;
  valueField: string;
  labelField: string;
  idField: string;
  permission: string;
}

/**
 * Référence partagée « agents de collecte » — utilisée par le champ de
 * formulaire `grp_a/agent` (voir `ReglagesChamp.tsx`) et par la résolution
 * auteur → nom dans les vues « tous les brouillons » (voir `BrouillonsPage`) :
 * une seule définition pour ne pas laisser diverger les deux usages.
 */
export const SOURCE_AGENTS_COLLECTE: OptionsSource = {
  mode: 'reference',
  resource: 'agents_collecte',
  endpoint: '/api/references/agents-collecte',
  valueField: 'value',
  labelField: 'label',
  idField: 'resourceId',
  permission: 'collecte.create',
};

export interface ConditionChamp {
  active: boolean;
  champParentCode: string;
  operateur: 'EQUALS' | 'CONTAINS';
  valeur: string;
  logique: 'AND' | 'OR';
}

export interface RegleValidation {
  operator: 'GTE' | 'LTE';
  /** Borne littérale. */
  value?: number;
  /** Borne portée par un autre champ du formulaire (ex. `grp_a/nb_employes_total`). */
  fieldCode?: string;
  /** Borne calculée à l'exécution. */
  dynamicValue?: 'CURRENT_YEAR';
}

export interface ValidationChamp {
  rules: RegleValidation[];
  message: string;
}

/**
 * ⚠ `validation` arrive comme **tableau vide** `[]` quand il n'y a pas de règle,
 * pas comme `null` — d'où le type union et le garde `hasValidation()`.
 */
export interface ChampNatif {
  id: number;
  code: string;
  libelle: string;
  type: TypeChampNatif;
  ordre: number;
  obligatoire: boolean;
  aide: string | null;
  options: OptionChamp[];
  optionsSource: OptionsSource | null;
  validation: ValidationChamp | [];
  valeurParDefaut: string | null;
  condition: ConditionChamp | null;
}

export interface SectionNatif {
  id: number;
  code: string;
  libelle: string;
  ordre: number;
  champs: ChampNatif[];
}

export interface FormulairePublie {
  id: number;
  code: string;
  version: number;
  titre: string;
  description: string;
  sections: SectionNatif[];
}

/** Les 3 formulaires publiés — mêmes routes, seul le code change. */
export const CODES_FORMULAIRES = ['FICHE_SITE', 'FICHE_EMPLOYE', 'FICHE_ENVIRONNEMENT'] as const;
export type CodeFormulaire = (typeof CODES_FORMULAIRES)[number];

/* ═══ Valeurs de réponse ═══ */

export interface Geopoint {
  lat: number;
  lng: number;
}

/** GEOPOINT = objet, CHOIX_MULTIPLE = string[], le reste = scalaire. */
export type ValeurChamp = string | number | boolean | string[] | Geopoint | null;

export type ReponsesFormulaire = Record<string, ValeurChamp>;

/* ═══ Soumissions ═══ */

export type StatutSoumissionNative = 'BROUILLON' | 'FINALISEE' | 'SYNCHRONISEE';

export interface SoumissionNative {
  id: number;
  clientSubmissionId: string;
  formulaireCode: string;
  statut: StatutSoumissionNative;
  latitude: number | null;
  longitude: number | null;
  reponses: ReponsesFormulaire;
  createdAt: string;
  updatedAt: string;
  /** Auteur de la soumission — sert à cloisonner « Mes brouillons » par agent. */
  createdById: number | null;
  /**
   * Compteur de révision porté par le serveur (constaté jusqu'à 4 sur un
   * brouillon plusieurs fois complété). Reçu en lecture ; non réémis à
   * l'écriture tant que l'API ne documente pas de conflit optimiste dessus —
   * l'inventer serait risquer un rejet silencieux du PUT.
   */
  revision: number | null;
}

export interface CreerBrouillonInput {
  /** Uniquement à la création — jamais renvoyé sur le PUT de complétion. */
  formulaireCode: string;
  latitude?: number;
  longitude?: number;
  reponses: ReponsesFormulaire;
}

export interface CompleterBrouillonInput {
  reponses: ReponsesFormulaire;
}

/** Erreur de validation renvoyée par `POST /soumissions/{id}/finaliser` en 422. */
export interface ErreurValidationServeur {
  champCode: string;
  message: string;
}

/* ═══ Gardes ═══ */

/**
 * `validation` et `options` arrivent en tableau vide quand il n'y a rien : un
 * simple test de vérité les laisserait passer (`[]` est truthy).
 */
export function hasValidation(champ: ChampNatif): champ is ChampNatif & { validation: ValidationChamp } {
  const v = champ.validation;
  return !Array.isArray(v) && v != null && Array.isArray(v.rules) && v.rules.length > 0;
}

export function hasOptionsFigees(champ: ChampNatif): boolean {
  return Array.isArray(champ.options) && champ.options.length > 0;
}

export function hasCondition(champ: ChampNatif): champ is ChampNatif & { condition: ConditionChamp } {
  return champ.condition != null && champ.condition.active === true;
}

export function isChampNumerique(champ: ChampNatif): boolean {
  return champ.type === 'ENTIER' || champ.type === 'DECIMAL';
}

export function isChampChoix(champ: ChampNatif): boolean {
  return champ.type === 'CHOIX_SIMPLE' || champ.type === 'CHOIX_MULTIPLE';
}

export function isGeopoint(v: ValeurChamp | undefined): v is Geopoint {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    && typeof (v as Geopoint).lat === 'number' && typeof (v as Geopoint).lng === 'number';
}

/** Aplati toutes les sections en une liste de champs, triée par ordre de section puis de champ. */
export function tousLesChamps(f: FormulairePublie): ChampNatif[] {
  return [...f.sections]
    .sort((a, b) => a.ordre - b.ordre)
    .flatMap((s) => [...s.champs].sort((a, b) => a.ordre - b.ordre));
}

export function compterChamps(f: FormulairePublie): number {
  return f.sections.reduce((n, s) => n + s.champs.length, 0);
}

/** Une réponse compte comme « remplie » — `0` et `false` sont des réponses valides. */
export function estRempli(v: ValeurChamp | undefined): boolean {
  if (v === undefined || v === null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}
