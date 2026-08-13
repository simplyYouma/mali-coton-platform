import type { Paginated } from '@/types/common';

export type StatutFormulaire = 'brouillon' | 'publie' | 'archive';
export type StatutSoumission = 'brouillon' | 'soumis' | 'valide' | 'rejete';
export type SourceSoumission = 'plateforme' | 'mobile' | 'kobo';

/** Valeurs backend (API Platform) pour typeChamp */
export type TypeChamp =
  | 'texte'
  | 'textarea'
  | 'nombre'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'fichier'
  | 'email'
  | 'telephone'
  | 'geo';

export interface ValidationJson {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  regex?: string;
  message?: string;
}

export interface ChampFormulaire {
  id: number;
  '@id'?: string;
  libelle: string;
  code: string;
  typeChamp: TypeChamp;
  obligatoire: boolean;
  ordre: number;
  aide?: string;
  optionsJson?: string[];
  validationJson?: ValidationJson;
  valeurParDefaut?: string;
  actif: boolean;
}

export interface FormulaireCollecte {
  id: number;
  '@id'?: string;
  titre: string;
  code: string;
  description?: string;
  typeFormulaire: string;
  statut: StatutFormulaire;
  version: number;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  champs: ChampFormulaire[];
  soumissions?: SoumissionResume[];
}

export interface SoumissionResume {
  id: number;
  formulaire: { id: number; titre: string; code: string; typeFormulaire: string; statut: string };
  siteTeinture?: string;
  collecteTerrain?: string;
  soumisPar: string;
  statut: StatutSoumission;
  source: SourceSoumission;
  latitude?: number;
  longitude?: number;
  dateSoumission: string;
}

export interface ReponseChamp {
  id?: number;
  champId: number;
  libelle: string;
  typeChamp: TypeChamp;
  valeurTexte?: string;
  valeurNombre?: string;
  valeurDate?: string;
  valeurJson?: string[];
  fichierUrl?: string;
}

export interface SoumissionFormulaire {
  id: number;
  formulaire: Pick<FormulaireCollecte, 'id' | 'titre' | 'code' | 'typeFormulaire' | 'statut'>;
  siteTeinture?: string;
  collecteTerrain?: string;
  soumisPar: string;
  statut: StatutSoumission;
  source: SourceSoumission;
  latitude?: number;
  longitude?: number;
  dateSoumission: string;
  createdAt: string;
  updatedAt: string;
  reponses: ReponseChamp[];
}

/* ── Input types pour le CRUD ── */

export interface FormulaireInput {
  titre: string;
  code: string;
  description?: string;
  typeFormulaire: string;
  statut: StatutFormulaire;
  version?: number;
  actif?: boolean;
}

export interface ChampInput {
  formulaire: string; // IRI ex. /api/formulaire_collectes/3
  libelle: string;
  code: string;
  typeChamp: TypeChamp;
  obligatoire: boolean;
  ordre: number;
  aide?: string;
  optionsJson?: string[];
  validationJson?: ValidationJson;
  valeurParDefaut?: string;
  actif?: boolean;
}

export type ChampUpdateInput = Partial<Omit<ChampInput, 'formulaire'>>;

/* ── Paginated aliases ── */
export type PaginatedFormulaires = Paginated<FormulaireCollecte>;
export type PaginatedSoumissions = Paginated<SoumissionFormulaire>;
export type PaginatedChamps = Paginated<ChampFormulaire>;

/* ── Labels & variants ── */

export const STATUT_FORMULAIRE_LABEL: Record<StatutFormulaire, string> = {
  brouillon: 'Brouillon',
  publie: 'Publié',
  archive: 'Archivé',
};

export const STATUT_FORMULAIRE_VARIANT: Record<
  StatutFormulaire,
  'neutral' | 'info' | 'success' | 'warning'
> = {
  brouillon: 'warning',
  publie: 'success',
  archive: 'neutral',
};

export const STATUT_SOUMISSION_LABEL: Record<StatutSoumission, string> = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  valide: 'Validé',
  rejete: 'Rejeté',
};

export const STATUT_SOUMISSION_VARIANT: Record<
  StatutSoumission,
  'neutral' | 'info' | 'success' | 'danger'
> = {
  brouillon: 'neutral',
  soumis: 'info',
  valide: 'success',
  rejete: 'danger',
};

export const TYPE_CHAMP_LABEL: Record<TypeChamp, string> = {
  texte: 'Texte court',
  textarea: 'Texte long',
  nombre: 'Nombre',
  date: 'Date',
  select: 'Liste déroulante',
  radio: 'Choix unique',
  checkbox: 'Cases à cocher',
  fichier: 'Fichier',
  email: 'E-mail',
  telephone: 'Téléphone',
  geo: 'Coordonnées GPS',
};

export const TYPE_CHAMP_OPTIONS = (Object.keys(TYPE_CHAMP_LABEL) as TypeChamp[]).map((k) => ({
  value: k,
  label: TYPE_CHAMP_LABEL[k],
}));

export const HAS_OPTIONS: TypeChamp[] = ['select', 'radio', 'checkbox'];

/** Retourne la valeur lisible d'une réponse selon le type de champ. */
export function valeurReponse(r: ReponseChamp): string {
  if (r.valeurJson && r.valeurJson.length > 0) return r.valeurJson.join(', ');
  return r.valeurTexte ?? r.valeurNombre ?? r.valeurDate ?? r.fichierUrl ?? '—';
}
