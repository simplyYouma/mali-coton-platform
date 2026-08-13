import type { Paginated } from '@/types/common';
import { http } from '@/lib/http';
import { API_MODE, resourcePath } from '@/lib/apiConfig';
import { unwrapPaginated, iriOf } from '@/lib/jsonld';
import type {
  FormulaireCollecte,
  FormulaireInput,
  SoumissionFormulaire,
  StatutSoumission,
  SourceSoumission,
  ChampFormulaire,
  ChampInput,
  ChampUpdateInput,
} from './formulaires.types';

/* ── Query params ── */

export interface FormulairesQuery {
  actif?: boolean;
  typeFormulaire?: string;
  statut?: string;
}

export interface SoumissionsQuery {
  formulaireId?: string;
  siteId?: string;
  statut?: StatutSoumission;
  soumisPar?: string;
}

/* ── Réponse soumission ── */

export interface SoumissionReponseInput {
  champId: number;
  valeurTexte?: string;
  valeurNombre?: string;
  valeurDate?: string;
  valeurJson?: string[];
  fichierUrl?: string;
}

export interface SoumissionInput {
  formulaireId: number;
  siteTeinture?: string;
  collecteTerrain?: string;
  soumisPar: string;
  source?: SourceSoumission;
  latitude?: number;
  longitude?: number;
}

/* ═══════════════════════════════════════════════════════════
   FORMULAIRE_COLLECTES — CRUD
═══════════════════════════════════════════════════════════ */

async function unwrapFormulaires(raw: unknown): Promise<Paginated<FormulaireCollecte>> {
  const page = unwrapPaginated<FormulaireCollecte>(raw);
  return page;
}

export async function fetchFormulaires(
  query: FormulairesQuery = {},
): Promise<Paginated<FormulaireCollecte>> {
  if (API_MODE === 'live') {
    const raw = await http<unknown>(resourcePath('formulaires'), { query: { ...query } });
    return unwrapFormulaires(raw);
  }
  return http<Paginated<FormulaireCollecte>>(resourcePath('formulaires'), { query: { ...query } });
}

export async function fetchFormulaire(id: string): Promise<FormulaireCollecte> {
  return http<FormulaireCollecte>(resourcePath('formulaires', id));
}

export async function createFormulaire(input: FormulaireInput): Promise<FormulaireCollecte> {
  return http<FormulaireCollecte>(resourcePath('formulaires'), {
    method: 'POST',
    body: input,
  });
}

export async function updateFormulaire(
  id: string,
  input: Partial<FormulaireInput>,
): Promise<FormulaireCollecte> {
  return http<FormulaireCollecte>(resourcePath('formulaires', id), {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteFormulaire(id: string): Promise<void> {
  return http<void>(resourcePath('formulaires', id), { method: 'DELETE' });
}

/* ═══════════════════════════════════════════════════════════
   CHAMP_FORMULAIRES — CRUD
═══════════════════════════════════════════════════════════ */

export async function fetchChamps(formulaireId: string): Promise<Paginated<ChampFormulaire>> {
  if (API_MODE === 'live') {
    const raw = await http<unknown>(resourcePath('champFormulaires'), {
      query: { formulaire: iriOf('formulaire_collectes', formulaireId) },
    });
    return unwrapPaginated<ChampFormulaire>(raw);
  }
  return http<Paginated<ChampFormulaire>>(resourcePath('champFormulaires'), {
    query: { formulaireId },
  });
}

export async function fetchChamp(id: string): Promise<ChampFormulaire> {
  return http<ChampFormulaire>(resourcePath('champFormulaires', id));
}

export async function createChamp(input: ChampInput): Promise<ChampFormulaire> {
  return http<ChampFormulaire>(resourcePath('champFormulaires'), {
    method: 'POST',
    body: {
      ...input,
      actif: input.actif ?? true,
    },
  });
}

export async function updateChamp(
  id: string,
  input: ChampUpdateInput,
): Promise<ChampFormulaire> {
  return http<ChampFormulaire>(resourcePath('champFormulaires', id), {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteChamp(id: string): Promise<void> {
  return http<void>(resourcePath('champFormulaires', id), { method: 'DELETE' });
}

/* ═══════════════════════════════════════════════════════════
   SOUMISSIONS — lecture + création
═══════════════════════════════════════════════════════════ */

export async function fetchSoumissions(
  query: SoumissionsQuery = {},
): Promise<Paginated<SoumissionFormulaire>> {
  if (API_MODE === 'live') {
    const raw = await http<unknown>(resourcePath('soumissions'), { query: { ...query } });
    return unwrapPaginated<SoumissionFormulaire>(raw);
  }
  return http<Paginated<SoumissionFormulaire>>(resourcePath('soumissions'), {
    query: { ...query },
  });
}

export async function fetchSoumission(id: string): Promise<SoumissionFormulaire> {
  return http<SoumissionFormulaire>(resourcePath('soumissions', id));
}

/**
 * Soumission en 2 temps :
 *  1. POST soumission_formulaires → récupère @id
 *  2. POST reponse_champs pour chaque réponse (parallèle)
 */
export async function submitFormulaire(
  input: SoumissionInput,
  reponses: SoumissionReponseInput[],
): Promise<SoumissionFormulaire> {
  if (API_MODE === 'live') {
    const soumission = await http<{ id: number; '@id'?: string }>(resourcePath('soumissions'), {
      method: 'POST',
      body: {
        formulaire: iriOf('formulaire_collectes', String(input.formulaireId)),
        siteTeinture: input.siteTeinture,
        collecteTerrain: input.collecteTerrain,
        soumisPar: input.soumisPar,
        statut: 'soumis',
        source: input.source ?? 'plateforme',
        latitude: input.latitude,
        longitude: input.longitude,
        dateSoumission: new Date().toISOString(),
      },
    });

    const soumissionIri = soumission['@id'] ?? iriOf('soumission_formulaires', soumission.id);

    await Promise.all(
      reponses.map((r) =>
        http<void>(resourcePath('reponses'), {
          method: 'POST',
          body: {
            soumission: soumissionIri,
            champ: iriOf('champ_formulaires', String(r.champId)),
            valeurTexte: r.valeurTexte,
            valeurNombre: r.valeurNombre,
            valeurDate: r.valeurDate,
            valeurJson: r.valeurJson,
            fichierUrl: r.fichierUrl,
          },
        }),
      ),
    );

    return fetchSoumission(String(soumission.id));
  }

  return http<SoumissionFormulaire>(resourcePath('soumissions'), {
    method: 'POST',
    body: {
      ...input,
      statut: 'soumis',
      source: input.source ?? 'plateforme',
      dateSoumission: new Date().toISOString(),
      reponses,
    },
  });
}
