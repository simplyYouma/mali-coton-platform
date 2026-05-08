/**
 * Référentiel des laboratoires agréés.
 */
export interface Lab {
  id: string;
  name: string;
  city: string;
  contactEmail?: string;
  contactPhone?: string;
  /** SLA contractuel : nombre de jours ouvrés pour rendre le bordereau. */
  slaBusinessDays: number;
  /** Domaines pris en charge par ce labo. */
  capabilities: Array<'water_chem' | 'soil_chem' | 'heavy_metals' | 'voc'>;
  isActive: boolean;
  /** Labo de référence du projet. */
  isReference?: boolean;
}
