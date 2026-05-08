import type { ConformityLevel, GpsPoint } from '@/types/common';

export type SiteType = 'GALA' | 'INDIGO' | 'GALA_INDIGO' | 'NATURELLE';
export type SiteLegalStatus = 'formel' | 'informel';

export interface Site {
  id: string;
  name: string;
  shortName: string;
  legalStatus: SiteLegalStatus;
  location: {
    commune: string;
    city: string;
    address?: string;
  };
  coordinates: GpsPoint;
  type: SiteType;
  workforce: number;
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
