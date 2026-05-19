import type { ConformityLevel, GpsPoint } from '@/types/common';

export type SiteType = 'GALA' | 'INDIGO' | 'GALA_INDIGO' | 'NATURELLE';
export type SiteLegalStatus = 'formel' | 'informel';

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
