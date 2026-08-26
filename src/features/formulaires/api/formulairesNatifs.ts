/**
 * Collecte Native — couche API.
 *
 * Ces routes vivent hors du modèle API Platform (`resourcePath`) : elles sont
 * exposées telles quelles sous `/api`, d'où les chemins littéraux.
 */

import { http, HttpError } from '@/lib/http';
import type {
  ChampNatif,
  CompleterBrouillonInput,
  CreerBrouillonInput,
  ErreurValidationServeur,
  FormulairePublie,
  OptionChamp,
  OptionsSource,
  SoumissionNative,
  TypeChampNatif,
} from './formulairesNatifs.types';

/* ═══════════════════════════════════════════════════════════
   Schémas publiés
═══════════════════════════════════════════════════════════ */

export async function fetchFormulairePublie(code: string): Promise<FormulairePublie> {
  const brut = await http<FormulairePublie>(`/formulaires-publies/${code}`);
  /* Le schéma pilote tout le rendu : s'il arrive tronqué (proxy mal configuré,
   * réponse d'erreur en 200), mieux vaut échouer ici — React Query bascule sur
   * l'état d'erreur de la page — que laisser un composant planter à l'écran. */
  if (!brut || !Array.isArray(brut.sections)) {
    throw new Error(`Schéma du formulaire ${code} invalide ou incomplet.`);
  }
  return {
    ...brut,
    sections: brut.sections.map((s) => ({ ...s, champs: Array.isArray(s.champs) ? s.champs : [] })),
  };
}

/* ═══════════════════════════════════════════════════════════
   Soumissions — cycle brouillon → finalisation
═══════════════════════════════════════════════════════════ */

/**
 * Le backend peut répondre soit une collection nue, soit une enveloppe
 * paginée : on normalise pour que l'appelant n'ait jamais à s'en soucier.
 */
function unwrapListe<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    /* `resultats` est la convention de ce backend (cf. /rapports-analyse) ;
     * les autres clés couvrent Hydra et les formes usuelles. Oublier
     * `resultats` renvoyait une liste vide — donc 0 brouillon partout. */
    for (const cle of ['resultats', 'member', 'hydra:member', 'items', 'data']) {
      if (Array.isArray(o[cle])) return o[cle] as T[];
    }
  }
  return [];
}

/**
 * Code du formulaire porté par une soumission, quelle que soit la forme reçue.
 *
 * Le backend renvoie aujourd'hui une chaîne (`formulaireCode: "FICHE_SITE"`),
 * mais la même donnée peut arriver en IRI ou en objet imbriqué selon le
 * sérialiseur. On normalise à l'entrée pour que le reste du module ne
 * connaisse qu'une seule forme — un groupement raté est silencieux.
 */
export function extraireFormulaireCode(brut: unknown): string {
  if (!brut || typeof brut !== 'object') return '';
  const o = brut as Record<string, unknown>;

  for (const cle of ['formulaireCode', 'formulaire', 'formulaireCollecte', 'code']) {
    const v = o[cle];
    if (typeof v === 'string' && v !== '') {
      // IRI (`/api/formulaire_collectes/7`) → dernier segment.
      return v.startsWith('/') ? (v.split('/').filter(Boolean).pop() ?? '') : v;
    }
    if (v && typeof v === 'object') {
      const imbrique = v as Record<string, unknown>;
      for (const sousCle of ['code', 'formulaireCode', '@id']) {
        const sv = imbrique[sousCle];
        if (typeof sv === 'string' && sv !== '') {
          return sv.startsWith('/') ? (sv.split('/').filter(Boolean).pop() ?? '') : sv;
        }
      }
    }
  }
  return '';
}

/** Normalise un brouillon brut : code de formulaire résolu, auteur et révision typés. */
function normaliserBrouillon(b: Record<string, unknown>): SoumissionNative {
  return {
    ...(b as unknown as SoumissionNative),
    formulaireCode: extraireFormulaireCode(b),
    createdById: typeof b.createdById === 'number' ? b.createdById : null,
    revision: typeof b.revision === 'number' ? b.revision : null,
  };
}

export async function fetchBrouillons(): Promise<SoumissionNative[]> {
  const liste = unwrapListe<Record<string, unknown>>(await http<unknown>('/soumissions/brouillons'));
  return liste.map(normaliserBrouillon);
}

export interface BrouillonsTousParams {
  page?: number;
  limite?: number;
  formulaireCode?: string;
}

export interface BrouillonsPortee {
  items: SoumissionNative[];
  total: number;
}

/**
 * Vue « tous » — tous les brouillons, tous auteurs, paginée par le serveur.
 * Réservée à qui détient `soumission.validate` (voir `fetchBrouillonsSelonPortee`).
 * `limite` doit pouvoir rester petit : un comptage par modèle n'a besoin que
 * de `total`, jamais de parcourir des pages entières pour l'obtenir.
 */
export async function fetchBrouillonsTous(params: BrouillonsTousParams = {}): Promise<BrouillonsPortee> {
  const brut = await http<Record<string, unknown>>('/soumissions/brouillons/tous', {
    query: {
      page: params.page,
      limite: params.limite,
      formulaireCode: params.formulaireCode,
    },
  });
  const items = unwrapListe<Record<string, unknown>>(brut).map(normaliserBrouillon);
  const total = typeof brut.total === 'number' ? brut.total : items.length;
  return { items, total };
}

/**
 * Choix de portée — décidé une fois ici, jamais dans un composant.
 *
 * `peutVoirTout` doit venir de `peut('soumission.validate')` (jamais d'un nom
 * de rôle) et n'est évaluable que via le hook d'autorisations ; cette
 * fonction ne fait qu'appliquer la décision déjà prise. Un agent de collecte
 * ne doit *jamais* recevoir `/brouillons/tous` puis se faire filtrer côté
 * client : les données des autres agents auraient alors déjà transité
 * jusqu'au navigateur.
 */
export async function fetchBrouillonsSelonPortee(
  peutVoirTout: boolean,
  params: BrouillonsTousParams = {},
): Promise<BrouillonsPortee> {
  if (peutVoirTout) return fetchBrouillonsTous(params);
  const items = await fetchBrouillons();
  return { items, total: items.length };
}

/**
 * Relit un brouillon précis par son identifiant client.
 *
 * La reprise ne doit jamais dépendre de la liste : elle peut être paginée ou
 * tronquée, et « Reprendre » vise un brouillon précis parmi plusieurs du même
 * modèle — pas le premier trouvé.
 */
export async function fetchBrouillon(clientSubmissionId: string): Promise<SoumissionNative> {
  const brut = await http<Record<string, unknown>>(`/soumissions/brouillons/${clientSubmissionId}`);
  return normaliserBrouillon(brut);
}

/** `formulaireCode` n'est accepté qu'ici — le PUT de complétion ne porte que `reponses`. */
export function creerBrouillon(input: CreerBrouillonInput): Promise<SoumissionNative> {
  return http<SoumissionNative>('/soumissions/brouillons', { method: 'POST', body: input });
}

/**
 * Le serveur renvoie un compteur `revision` sur chaque brouillon (constaté
 * jusqu'à 4 sur une même fiche plusieurs fois complétée), mais aucune
 * documentation ne précise s'il est attendu en retour pour un contrôle de
 * concurrence optimiste sur ce PUT. Faute de pouvoir le vérifier (endpoint
 * accessible seulement avec un jeton), on ne l'invente pas dans le corps —
 * l'ajouter sans certitude risquerait un rejet silencieux d'un champ non
 * attendu. `revision` est conservé côté client (`BrouillonLocal.revision`)
 * pour un usage futur si l'API venait à l'exiger.
 */
export function completerBrouillon(
  clientSubmissionId: string,
  input: CompleterBrouillonInput,
): Promise<SoumissionNative> {
  return http<SoumissionNative>(`/soumissions/brouillons/${clientSubmissionId}`, {
    method: 'PUT',
    body: input,
  });
}

/**
 * Erreurs de validation serveur remontées en 422 à la finalisation.
 *
 * Le backend n'a qu'un format documenté de façon lâche : on ratisse les formes
 * connues (`violations` d'API Platform, `erreurs`, dictionnaire code → message)
 * pour toujours pouvoir rattacher un message à son champ. Sans cela, une 422
 * retomberait en erreur générique — précisément ce qu'on veut éviter.
 */
export function extraireErreursValidation(err: unknown): ErreurValidationServeur[] {
  if (!(err instanceof HttpError) || err.status !== 422) return [];
  const body = err.body;
  if (!body || typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;

  const listes = [o.violations, o.erreurs, o.errors, o.detail].find(Array.isArray) as
    | unknown[]
    | undefined;
  if (listes) {
    return listes.flatMap((v): ErreurValidationServeur[] => {
      if (!v || typeof v !== 'object') return [];
      const e = v as Record<string, unknown>;
      const champCode = e.champCode ?? e.propertyPath ?? e.field ?? e.code;
      const message = e.message ?? e.libelle ?? e.detail;
      if (typeof champCode !== 'string' || typeof message !== 'string') return [];
      return [{ champCode, message }];
    });
  }

  // Forme dictionnaire : { "grp_a/nb_femmes": "Ne peut dépasser le total." }
  const dict = (o.erreurs ?? o.errors ?? o.violations) as unknown;
  if (dict && typeof dict === 'object' && !Array.isArray(dict)) {
    return Object.entries(dict as Record<string, unknown>).flatMap(([champCode, message]) => {
      if (typeof message === 'string') return [{ champCode, message }];
      if (Array.isArray(message) && typeof message[0] === 'string') {
        return [{ champCode, message: message[0] as string }];
      }
      return [];
    });
  }
  return [];
}

export function finaliserSoumission(id: number | string): Promise<SoumissionNative> {
  return http<SoumissionNative>(`/soumissions/${id}/finaliser`, { method: 'POST', body: {} });
}

/** Sync par lot — utilisé à la reprise réseau pour pousser les brouillons locaux. */
export function synchroniserSoumissions(
  soumissions: CreerBrouillonInput[],
): Promise<{ synchronisees?: number }> {
  return http('/soumissions/synchroniser', { method: 'POST', body: { soumissions } });
}

/* ═══════════════════════════════════════════════════════════
   Champs FICHIER
═══════════════════════════════════════════════════════════ */

export function uploaderFichierChamp(
  soumissionId: number | string,
  champCode: string,
  fichier: File,
): Promise<{ url?: string; nom?: string }> {
  const form = new FormData();
  form.append('file', fichier);
  // Le code contient une barre oblique (`grp_a/photo`) : il doit être encodé
  // pour ne pas être lu comme un segment d'URL supplémentaire.
  return http(`/soumissions/${soumissionId}/champs/${encodeURIComponent(champCode)}/fichier`, {
    method: 'POST',
    body: form,
  });
}

export function urlFichierChamp(soumissionId: number | string, champCode: string): string {
  return `/soumissions/${soumissionId}/champs/${encodeURIComponent(champCode)}/fichier`;
}

/* ═══════════════════════════════════════════════════════════
   Listes de référence (optionsSource)
═══════════════════════════════════════════════════════════ */

/**
 * Les endpoints de référence arrivent préfixés `/api/...` dans le schéma alors
 * que `http()` ajoute déjà ce préfixe : on le retire pour ne pas viser
 * `/api/api/references/...`.
 */
export function normaliserEndpoint(endpoint: string): string {
  return endpoint.replace(/^\/api(?=\/)/, '');
}

export async function fetchOptionsReference(source: OptionsSource): Promise<OptionChamp[]> {
  const raw = await http<unknown>(normaliserEndpoint(source.endpoint));
  return unwrapListe<Record<string, unknown>>(raw)
    /* Un élément explicitement désactivé (`actif: false`) — un site
     * `sites_collecte`, potentiellement d'autres ressources de référence à
     * l'avenir — ne doit jamais être une cible de saisie proposée. Générique
     * plutôt que spécifique à `sites_collecte` : la règle vaut pour toute
     * ressource de référence qui porte ce champ. Non vérifié si le backend
     * filtre déjà côté serveur — filtré ici dans le doute, sans effet si
     * l'API ne renvoie que des actifs. */
    .filter((item) => item.actif !== false)
    .map((item) => {
      const value = item[source.valueField] ?? item[source.idField];
      const label = item[source.labelField] ?? value;
      return { value: String(value ?? ''), label: String(label ?? '') };
    });
}

/* ═══════════════════════════════════════════════════════════
   Constructeur — structure du formulaire
   Capacités vérifiées sur l'API (voir CAPACITES_BUILDER).
═══════════════════════════════════════════════════════════ */

export interface AjouterChampInput {
  sectionCode: string;
  code: string;
  label: string;
  type: TypeChampNatif;
}

/** Ajout via la route dédiée du formulaire — attend l'id **numérique**, pas le code. */
export function ajouterChamp(formulaireId: number, input: AjouterChampInput): Promise<ChampNatif> {
  return http<ChampNatif>(`/formulaire_collectes/${formulaireId}/champs`, {
    method: 'POST',
    body: input,
  });
}

/** Mise à jour partielle d'un champ (PUT répond 405 sur cette ressource). */
export function modifierChamp(
  champId: number,
  patch: Partial<Omit<ChampNatif, 'id'>>,
): Promise<ChampNatif> {
  return http<ChampNatif>(`/champ_formulaires/${champId}`, { method: 'PATCH', body: patch });
}

export function supprimerChamp(champId: number): Promise<void> {
  return http<void>(`/champ_formulaires/${champId}`, { method: 'DELETE' });
}

/** Pas d'endpoint de réordonnancement en lot : on patche `ordre` champ par champ. */
export function reordonnerChamps(ordres: Array<{ id: number; ordre: number }>): Promise<ChampNatif[]> {
  return Promise.all(ordres.map(({ id, ordre }) => modifierChamp(id, { ordre })));
}

export interface SectionInput {
  code: string;
  libelle: string;
  ordre: number;
  formulaire?: string;
}

export function creerSection(input: SectionInput): Promise<unknown> {
  return http('/section_formulaires', { method: 'POST', body: input });
}

export function modifierSection(sectionId: number, patch: Partial<SectionInput>): Promise<unknown> {
  return http(`/section_formulaires/${sectionId}`, { method: 'PATCH', body: patch });
}

export function supprimerSection(sectionId: number): Promise<void> {
  return http<void>(`/section_formulaires/${sectionId}`, { method: 'DELETE' });
}

/**
 * Capacités d'édition réellement offertes par l'API, sondées le 2026-08-19
 * (404 = route absente, 405 = méthode refusée, 401/415 = route présente).
 *
 * Sert à désactiver une action avec un motif explicite plutôt qu'à la masquer,
 * et surtout à ne jamais laisser croire qu'une modification a été persistée.
 */
export const CAPACITES_BUILDER = {
  champCreer: true,
  champModifier: true,
  champSupprimer: true,
  champReordonner: true,
  sectionCreer: true,
  sectionModifier: true,
  sectionSupprimer: true,
  /** Aucun endpoint de réordonnancement en lot : fallback PATCH unitaires. */
  reordonnancementEnLot: false,
} as const;
