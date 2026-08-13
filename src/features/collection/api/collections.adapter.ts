/**
 * Adapter CollecteTerrain (backend API Platform) ↔ Collection (frontend).
 *
 * Le backend renvoie des champs français et des IRIs ; on normalise
 * pour que tous les composants existants continuent à fonctionner.
 */
import { iriToId } from '@/lib/jsonld';
import type { Collection, CollectionStatus, PhotoAttachment, Measurement } from './collection.types';

/**
 * Forme renvoyée par GET /api/collecte_terrains.
 * On déclare les noms réels du backend (API Platform) + variantes alias mock.
 */
export interface CollecteTerrain {
  '@id'?: string;
  '@type'?: string;
  id: number | string;
  // Champs réels du backend live
  siteTeinture?: string | null;    // IRI ex. /api/site_teintures/3
  agentCollecte?: string | null;   // nom ou code de l'agent (string libre)
  codeCollecte?: string | null;
  typeCollecte?: string | null;
  observations?: string | null;
  submittedAt?: string | null;
  // Alias mock / variantes de nommage
  site?: string | null;
  siteId?: string | null;
  agent?: string | null;
  agentId?: string | null;
  // Kobo
  koboSubmissionUuid?: string | null;
  koboVersion?: number | null;
  // Statut — backend peut envoyer français ou anglais
  statut?: string | null;
  status?: string | null;
  // Dates
  dateCollecte?: string | null;
  dateSaisie?: string | null;
  collectedAt?: string | null;
  syncedAt?: string | null;
  dateSynchronisation?: string | null;
  createdAt?: string | null;
  // GPS
  latitude?: number | null;
  longitude?: number | null;
  gps?: { lat: number; lng: number } | null;
  // Données terrain (absentes en phase A)
  measurements?: Measurement[];
  photos?: PhotoAttachment[];
}

function mapStatus(raw?: string | null): CollectionStatus {
  if (!raw) return 'submitted';
  const n = raw.toLowerCase().replace(/[_\s-]/g, '');
  const MAP: Record<string, CollectionStatus> = {
    soumise: 'submitted',
    submitted: 'submitted',
    enattentylabo: 'awaiting_lab',
    enattentedelabo: 'awaiting_lab',
    awaitinglab: 'awaiting_lab',
    labocomplete: 'lab_complete',
    labcomplete: 'lab_complete',
    analysesrecues: 'lab_complete',
    needscorrection: 'needs_correction',
    acorriger: 'needs_correction',
    correctiondemandee: 'needs_correction',
    validee: 'validated',
    validated: 'validated',
    rejetee: 'rejected',
    rejected: 'rejected',
    annulee: 'rejected',
  };
  return MAP[n] ?? 'submitted';
}

/* ────────────────────────────────────────────
   Adapter pour GET /api/import_kobos
   (historique des imports Kobo = les collectes)
──────────────────────────────────────────── */

import type { ImportKoboHistory } from './koboImport';

const TYPE_LABEL: Record<string, string> = {
  site: 'Sites de teinture',
  sites: 'Sites de teinture',
  employe: 'Employés',
  employes: 'Employés',
};

export function toCollectionFromKoboImport(b: ImportKoboHistory): Collection {
  const status: CollectionStatus = b.statut === 'success' ? 'submitted' : 'rejected';
  const typeLabel = TYPE_LABEL[b.typeFormulaire] ?? b.typeFormulaire;
  return {
    id: String(b.id),
    koboSubmissionUuid: b.koboFormUid,
    koboVersion: 1,
    siteId: typeLabel,
    agentId: String(b.nombreSoumissions),
    collectedAt: b.createdAt,
    status,
    syncedAt: b.createdAt,
    gps: null,
    measurements: [],
    photos: [],
  };
}

export function toCollection(b: CollecteTerrain): Collection {
  const id = String(b.id ?? '');
  // siteTeinture = champ réel backend (IRI) ; site = alias mock
  const siteId = b.siteId ?? iriToId(b.siteTeinture ?? b.site) ?? '';
  // agentCollecte = string libre backend ; agent = IRI alias mock
  const agentId = b.agentId ?? iriToId(b.agent) ?? b.agentCollecte ?? '';
  const collectedAt =
    b.collectedAt ?? b.dateCollecte ?? b.dateSaisie ?? b.createdAt ?? new Date().toISOString();
  const syncedAt = b.syncedAt ?? b.dateSynchronisation ?? null;
  const status = mapStatus((b.status ?? b.statut) as string);
  const gps =
    b.gps ??
    (b.latitude != null && b.longitude != null
      ? { lat: b.latitude, lng: b.longitude }
      : null);

  return {
    id,
    koboSubmissionUuid: b.koboSubmissionUuid ?? id,
    koboVersion: b.koboVersion ?? 1,
    siteId,
    agentId,
    collectedAt,
    status,
    syncedAt,
    gps,
    measurements: b.measurements ?? [],
    photos: b.photos ?? [],
  };
}
