import type { Lab } from '@/features/collection/api/labs.types';

/**
 * Référentiel mocké de laboratoires agréés.
 * LNE Bamako = laboratoire de référence du projet.
 */
export const mockLabs: Lab[] = [
  {
    id: 'lab.lne',
    name: 'LNE — Laboratoire National des Eaux',
    city: 'Bamako',
    contactEmail: 'lne@deh.gouv.ml',
    contactPhone: '+223 20 22 24 87',
    slaBusinessDays: 10,
    capabilities: ['water_chem', 'soil_chem', 'heavy_metals'],
    isActive: true,
    isReference: true,
  },
  {
    id: 'lab.lns-bamako',
    name: 'LNS — Laboratoire National de la Santé',
    city: 'Bamako',
    contactEmail: 'lns@sante.gouv.ml',
    contactPhone: '+223 20 22 47 47',
    slaBusinessDays: 7,
    capabilities: ['water_chem', 'heavy_metals', 'soil_chem'],
    isActive: true,
  },
  {
    id: 'lab.sotuba',
    name: 'Sotuba — Institut d\'Économie Rurale',
    city: 'Bamako',
    contactEmail: 'sotuba@ier.ml',
    contactPhone: '+223 20 24 64 64',
    slaBusinessDays: 10,
    capabilities: ['water_chem', 'soil_chem', 'heavy_metals'],
    isActive: true,
  },
  {
    id: 'lab.cnrst',
    name: 'CNRST — Centre National de la Recherche Scientifique et Technologique',
    city: 'Bamako',
    contactEmail: 'cnrst@cnrst.ml',
    slaBusinessDays: 14,
    capabilities: ['voc', 'heavy_metals', 'water_chem'],
    isActive: true,
  },
];
