import type { ConformityLevel, GpsPoint } from '@/types/common';

export type SiteType = 'GALA' | 'INDIGO' | 'GALA_INDIGO' | 'NATURELLE';
export type SiteLegalStatus = 'formel' | 'informel';
/**
 * Provenance du site — backend `source`. Les deux coexistent dans le même
 * référentiel mais n'offrent pas le même niveau de détail : un site
 * COLLECTE_NATIVE n'a pas de fiche terrain Kobo (`collecteSite`), donc pas
 * les champs qui n'existent que dans ce formulaire (dateVisite, sourceEau,
 * statutJuridique…). Voir `SiteDetailPage`.
 */
export type SiteSource = 'COLLECTE_NATIVE' | 'KOBO';

/**
 * Aligné sur `SiteTeinture` du backend client (API Platform).
 * Voir docs/CAHIER_PROJET.md §3.4.
 */
export interface Site {
  id: string;
  /** Code officiel du site (SITE01, SITE02…) — backend `codeSite`. */
  codeSite: string;
  /** Nom officiel complet — backend `nomSite`. */
  name: string;
  /** Libellé court pour l'UI (cards, lignes, breadcrumbs). */
  shortName: string;
  legalStatus: SiteLegalStatus;
  /** Niveau de formalisation administrative — backend `niveauFormalisation`. */
  niveauFormalisation?: string;
  location: {
    commune: string;
    city: string;
    /** Quartier précis — backend `quartier`. */
    quartier?: string;
    address?: string;
  };
  coordinates: GpsPoint;
  type: SiteType;
  /** Effectif total — backend `nombreTotal`. */
  workforce: number;
  /** Femmes parmi l'effectif — backend `nombreFemmes`. */
  workforceWomen?: number;
  /** Hommes parmi l'effectif — backend `nombreHommes`. */
  workforceMen?: number;
  /** Superficie de l'atelier (string libre côté backend, ex. "120 m²"). */
  superficie?: string;
  /** Responsable du site — backend `responsableNom`. */
  responsableName?: string;
  /** Téléphone / e-mail du responsable — backend `responsableContact`. */
  responsableContact?: string;
  createdYear: number;
  isReference: boolean;
  description?: string;
  photos: string[];
  // Synthèse de conformité courante (calculée serveur, ici mockée)
  conformity: ConformityLevel;
  conformityByDomain: {
    water: ConformityLevel;
    soil: ConformityLevel;
    air: ConformityLevel;
    waste: ConformityLevel;
    health: ConformityLevel;
  };
  lastCollectionAt: string | null;
  collectionsCount: number;
  /**
   * État actif/inactif — backend `actif` (booléen). Un site désactivé sort
   * des statistiques mais reste consultable par sa fiche.
   *
   * Absent dans la réponse backend = actif : c'est le mapping le plus sûr
   * pour un champ nouvellement introduit, l'inverse ferait disparaître tout
   * le référentiel existant des écrans et des stats d'un coup. Voir
   * `toSite()` dans `sites.adapter.ts`.
   */
  actif: boolean;
  /**
   * Absent = KOBO : c'est la provenance historique, seule qui existait avant
   * l'introduction de la collecte native — jamais l'inverse, qui ferait
   * passer tout le référentiel existant en COLLECTE_NATIVE et masquerait à
   * tort ses champs de fiche terrain.
   */
  source: SiteSource;
}

export const SITE_TYPE_LABEL: Record<SiteType, string> = {
  GALA: 'GALA — teinture chimique',
  INDIGO: 'INDIGO — teinture naturelle Indigofera',
  GALA_INDIGO: 'GALA + INDIGO',
  NATURELLE: 'Teinture naturelle',
};

export const SITE_TYPE_SHORT: Record<SiteType, string> = {
  GALA: 'GALA',
  INDIGO: 'INDIGO',
  GALA_INDIGO: 'GALA + INDIGO',
  NATURELLE: 'Naturelle',
};

export const SITE_SOURCE_LABEL: Record<SiteSource, string> = {
  COLLECTE_NATIVE: 'Collecte native',
  KOBO: 'Kobo',
};
