import { http } from '@/lib/http';
import { API_MODE } from '@/lib/apiConfig';
import { unwrapPaginated } from '@/lib/jsonld';

export interface ParametreUnite {
  id: number;
  libelle: string;
  sigle: string;
  parametreAnalyses: string[];
}

export interface ParametreAnalyse {
  id: number;
  nom: string;
  categorie: 'physique' | 'chimique' | string;
  description?: string | null;
  unite?: string | null;
  createdAt?: string | null;
}

interface ParametreUniteBackend {
  id: number;
  libelle: string;
  sigle: string;
  parametreAnalyses?: string[];
}

interface ParametreAnalyseBackend {
  id: number;
  nom: string;
  categorie: string;
  description?: string | null;
  unite?: string | null;
  createdAt?: string | null;
}

export async function fetchParametreUnites(): Promise<ParametreUnite[]> {
  if (API_MODE !== 'live') return [];
  const raw = await http<unknown>('/parametre_unites');
  return unwrapPaginated<ParametreUniteBackend>(raw).items.map((b) => ({
    id: b.id,
    libelle: b.libelle,
    sigle: b.sigle,
    parametreAnalyses: b.parametreAnalyses ?? [],
  }));
}

export async function fetchParametreAnalyses(): Promise<ParametreAnalyse[]> {
  if (API_MODE !== 'live') return [];
  const raw = await http<unknown>('/parametre_analyses');
  return unwrapPaginated<ParametreAnalyseBackend>(raw).items.map((b) => ({
    id: b.id,
    nom: b.nom,
    categorie: b.categorie,
    description: b.description,
    unite: b.unite,
    createdAt: b.createdAt,
  }));
}
