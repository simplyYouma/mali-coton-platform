import { http, HttpResponse, delay } from 'msw';
import { mockCollections } from '../fixtures/collections';
import { mockUsers } from '../fixtures/users';
import { mockLabs } from '../fixtures/labs';
import { mockSites } from '../fixtures/sites';
import {
  hasPendingLabSamples,
  type Collection,
  type CollectionNotification,
  type Measurement,
} from '@/features/collection/api/collection.types';
import {
  validateKoboSubmission,
  type KoboSubmission,
} from '@/features/collection/api/../lib/koboIngestion';
import { uuid } from '@/lib/uuid';

/**
 * Génère des notifications mock vers un laboratoire (qui n'a PAS de compte
 * plateforme — il reçoit uniquement les notifications sur ses coordonnées
 * de contact officielles).
 */
function buildLabNotifications(
  labId: string,
  kind: CollectionNotification['kind'],
): CollectionNotification[] {
  const lab = mockLabs.find((l) => l.id === labId);
  if (!lab) return [];
  const now = new Date().toISOString();
  const notifs: CollectionNotification[] = [];
  if (lab.contactEmail) {
    notifs.push({
      id: uuid(),
      channel: 'email',
      recipient: lab.contactEmail,
      recipientUserId: labId, // pas un user — on stocke labId comme référence
      kind,
      sentAt: now,
      ref: `msg-${uuid().slice(0, 8)}@plateforme.pnud.org`,
    });
  }
  if (lab.contactPhone) {
    notifs.push({
      id: uuid(),
      channel: 'sms',
      recipient: lab.contactPhone,
      recipientUserId: labId,
      kind,
      sentAt: now,
      ref: `SMS-${uuid().slice(0, 6).toUpperCase()}`,
    });
  }
  return notifs;
}

/**
 * Génère les notifications mock à envoyer à l'agent suite à une action
 * superviseur (correction demandée / rejet / validation). Sans serveur SMTP
 * ni passerelle SMS, on consigne juste les envois — c'est le bon réflexe pour
 * une maquette : le contrat de notification est tracé, le contenu reste à
 * générer par la couche transport en prod.
 */
function buildNotifications(
  recipientUserId: string,
  kind: CollectionNotification['kind'],
): CollectionNotification[] {
  const recipient = mockUsers.find((u) => u.id === recipientUserId);
  if (!recipient) return [];
  const now = new Date().toISOString();
  const notifs: CollectionNotification[] = [];
  if (recipient.email) {
    notifs.push({
      id: uuid(),
      channel: 'email',
      recipient: recipient.email,
      recipientUserId: recipient.id,
      kind,
      sentAt: now,
      ref: `msg-${uuid().slice(0, 8)}@plateforme.pnud.org`,
    });
  }
  if (recipient.phone) {
    notifs.push({
      id: uuid(),
      channel: 'sms',
      recipient: recipient.phone,
      recipientUserId: recipient.id,
      kind,
      sentAt: now,
      ref: `SMS-${uuid().slice(0, 6).toUpperCase()}`,
    });
  }
  return notifs;
}

/** Renvoie le 1er superviseur qui couvre le site de la collecte. */
function findSupervisor(siteId: string): string | null {
  return (
    mockUsers.find(
      (u) => u.role === 'superviseur' && u.assignedSiteIds.includes(siteId),
    )?.id ?? null
  );
}

const seenIdempotencyKeys = new Set<string>();

export const collectionsHandlers = [
  http.get('/api/v1/collections', async ({ request }) => {
    await delay(250);
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const status = url.searchParams.get('status');
    const agentId = url.searchParams.get('agentId');

    let items = [...mockCollections];
    if (siteId) items = items.filter((c) => c.siteId === siteId);
    if (status) items = items.filter((c) => c.status === status);
    if (agentId) items = items.filter((c) => c.agentId === agentId);

    return HttpResponse.json({ items, total: items.length, page: 1, pageSize: items.length });
  }),

  http.get('/api/v1/collections/:id', async ({ params }) => {
    await delay(200);
    const item = mockCollections.find((c) => c.id === params.id);
    if (!item) {
      return HttpResponse.json(
        {
          error: {
            code: 'not_found',
            message: 'Collecte introuvable.',
            correlationId: uuid(),
          },
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(item);
  }),

  /**
   * POST /collections/sync — synchro batch d'une collecte soumise depuis l'outbox
   * tablette. Implémentation idempotente via header `Idempotency-Key`
   * (tech-spec §5.1 + §6.2).
   *
   * Maquette L2 : on accepte le payload, on calcule le statut serveur selon
   * la présence de prélèvements labo en attente (submitted vs awaiting_lab),
   * et on renvoie la collecte enrichie du syncedAt.
   */
  http.post('/api/v1/collections/sync', async ({ request }) => {
    await delay(400);

    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (idempotencyKey && seenIdempotencyKeys.has(idempotencyKey)) {
      return HttpResponse.json(
        {
          accepted: true,
          deduplicated: true,
          message: 'Soumission déjà reçue (idempotence)',
        },
        { status: 200 },
      );
    }
    if (idempotencyKey) seenIdempotencyKeys.add(idempotencyKey);

    const body = (await request.json()) as Collection;

    const serverStatus = hasPendingLabSamples(body) ? 'awaiting_lab' : 'submitted';
    const stored: Collection = {
      ...body,
      status: serverStatus,
      syncedAt: new Date().toISOString(),
    };

    return HttpResponse.json(stored, { status: 201 });
  }),

  /**
   * PATCH /collections/:id/measurements/:indicatorId — saisie différée d'un
   * résultat labo par le superviseur (CDC §7.2 modèle hybride).
   * Met à jour la mesure et bascule le statut collecte → lab_complete si
   * tous les bordereaux ont été reçus.
   */
  http.patch(
    '/api/v1/collections/:id/measurements/:indicatorId',
    async ({ params, request }) => {
      await delay(250);
      const item = mockCollections.find((c) => c.id === params.id);
      if (!item) {
        return HttpResponse.json(
          {
            error: {
              code: 'not_found',
              message: 'Collecte introuvable.',
              correlationId: uuid(),
            },
          },
          { status: 404 },
        );
      }
      const patch = (await request.json()) as Record<string, unknown>;
      const measurement = item.measurements.find(
        (m) => m.indicatorId === params.indicatorId,
      );
      if (!measurement) {
        return HttpResponse.json(
          {
            error: {
              code: 'not_found',
              message: 'Mesure introuvable.',
              correlationId: uuid(),
            },
          },
          { status: 404 },
        );
      }
      Object.assign(measurement, patch);
      // Si la mesure passe en lab_received et qu'aucune autre n'est en attente,
      // la collecte bascule en lab_complete.
      const stillPending = item.measurements.some((m) => m.acquisition === 'lab_pending');
      if (!stillPending && item.status === 'awaiting_lab') {
        item.status = 'lab_complete';
      }
      return HttpResponse.json(item);
    },
  ),

  /**
   * PATCH /collections/:id — utilisé par le superviseur pour valider ou
   * rejeter une collecte (CDC §5.1 — droits superviseur).
   */
  http.patch('/api/v1/collections/:id', async ({ params, request }) => {
    await delay(250);
    const item = mockCollections.find((c) => c.id === params.id);
    if (!item) {
      return HttpResponse.json(
        {
          error: {
            code: 'not_found',
            message: 'Collecte introuvable.',
            correlationId: uuid(),
          },
        },
        { status: 404 },
      );
    }
    const patch = (await request.json()) as Partial<Collection>;
    Object.assign(item, patch, { syncedAt: new Date().toISOString() });

    // Génère la notification mock à l'agent en fonction de l'action superviseur.
    let kind: CollectionNotification['kind'] | null = null;
    if (patch.status === 'needs_correction' && patch.correctionRequest) kind = 'correction_requested';
    else if (patch.status === 'rejected') kind = 'rejected';
    else if (patch.status === 'validated') kind = 'validated';
    if (kind) {
      const newNotifs = buildNotifications(item.agentId, kind);
      item.notifications = [...(item.notifications ?? []), ...newNotifs];
    }

    return HttpResponse.json(item);
  }),

  /* ─── Workflow labo : actions par flacon (containerId) ─── */

  /** POST .../lab-samples/:containerId/receive — le labo accuse réception physique. */
  http.post(
    '/api/v1/collections/:id/lab-samples/:containerId/receive',
    async ({ params, request }) => {
      await delay(180);
      const item = mockCollections.find((c) => c.id === params.id);
      if (!item) return error404Collection();
      const body = (await request.json()) as { receivedBy: string };
      const now = new Date().toISOString();
      updateContainer(item, String(params.containerId), (s) => ({
        ...s,
        status: 'received_at_lab',
        receivedAt: now,
        analyzedBy: undefined,
      }));
      // Notifie le superviseur du site
      const supId = findSupervisor(item.siteId);
      if (supId) {
        const notifs = buildNotifications(supId, 'sample_sent_to_lab');
        item.notifications = [...(item.notifications ?? []), ...notifs];
      }
      void body;
      return HttpResponse.json(item);
    },
  ),

  /** POST .../lab-samples/:containerId/refuse — le labo refuse (flacon cassé, volume…). */
  http.post(
    '/api/v1/collections/:id/lab-samples/:containerId/refuse',
    async ({ params, request }) => {
      await delay(200);
      const item = mockCollections.find((c) => c.id === params.id);
      if (!item) return error404Collection();
      const body = (await request.json()) as { reason: string; refusedBy: string };
      updateContainer(item, String(params.containerId), (s) => ({
        ...s,
        status: 'refused_by_lab',
        refusalReason: body.reason,
      }));
      // Notifie l'agent + le superviseur (l'agent doit re-prélever)
      const supId = findSupervisor(item.siteId);
      const recipients = [item.agentId, supId].filter(Boolean) as string[];
      for (const r of recipients) {
        const notifs = buildNotifications(r, 'sample_refused_by_lab');
        item.notifications = [...(item.notifications ?? []), ...notifs];
      }
      return HttpResponse.json(item);
    },
  ),

  /** POST .../lab-samples/:containerId/transmit — le labo rend le bordereau. */
  http.post(
    '/api/v1/collections/:id/lab-samples/:containerId/transmit',
    async ({ params, request }) => {
      await delay(220);
      const item = mockCollections.find((c) => c.id === params.id);
      if (!item) return error404Collection();
      const body = (await request.json()) as {
        analyzedBy: string;
        bordereauRef?: string;
        bordereauUrl?: string;
        values: Array<{ indicatorId: string; value: number | string }>;
      };
      const now = new Date().toISOString();
      // Met à jour le sample partagé sur toutes les measurements du containerId
      updateContainer(item, String(params.containerId), (s) => ({
        ...s,
        status: 'bordereau_returned',
        analyzedAt: now,
        analyzedBy: body.analyzedBy,
        bordereauRef: body.bordereauRef,
        bordereauUrl: body.bordereauUrl,
      }));
      // Inscrit les valeurs sur chaque indicateur du flacon
      for (const v of body.values) {
        const m = item.measurements.find((x) => x.indicatorId === v.indicatorId);
        if (m) m.value = v.value;
      }
      // Notifie le superviseur
      const supId = findSupervisor(item.siteId);
      if (supId) {
        const notifs = buildNotifications(supId, 'bordereau_returned');
        item.notifications = [...(item.notifications ?? []), ...notifs];
      }
      return HttpResponse.json(item);
    },
  ),

  /** POST .../lab-samples/:containerId/reject — superviseur renvoie le bordereau au labo. */
  http.post(
    '/api/v1/collections/:id/lab-samples/:containerId/reject',
    async ({ params, request }) => {
      await delay(180);
      const item = mockCollections.find((c) => c.id === params.id);
      if (!item) return error404Collection();
      const body = (await request.json()) as { reason: string; rejectedBy: string };
      const now = new Date().toISOString();
      let labId: string | null = null;
      updateContainer(item, String(params.containerId), (s) => {
        labId = s.labId;
        return {
          ...s,
          status: 'rejected_by_supervisor',
          rejectionReason: body.reason,
          rejectedBy: body.rejectedBy,
          rejectedAt: now,
        };
      });
      // Notifie le labo concerné (via lab.contactEmail / contactPhone — pas de compte)
      if (labId) {
        const notifs = buildLabNotifications(labId, 'bordereau_rejected_by_supervisor');
        item.notifications = [...(item.notifications ?? []), ...notifs];
      }
      return HttpResponse.json(item);
    },
  ),

  /**
   * POST /api/v1/kobo/webhook — point d'entrée d'ingestion Kobo (cf. CAHIER_PROJET §5).
   * En prod : webhook configuré côté Kobo, payload validé puis transformé en
   * CollecteTerrain + Prelevement + Echantillons + AnalyseLab + Resultats.
   * En maquette : valide la structure, crée ou MAJ une Collection mockée,
   * incrémente koboVersion si même id_collecte_sa déjà connu.
   */
  http.post('/api/v1/kobo/webhook', async ({ request }) => {
    await delay(280);
    const payload = (await request.json()) as Partial<KoboSubmission>;
    const knownSiteCodes = mockSites.map((s) => s.codeSite);

    const validation = validateKoboSubmission(payload, knownSiteCodes);
    if (!validation.ok) {
      return HttpResponse.json(
        {
          error: {
            code: validation.errorCode,
            message: validation.message,
            correlationId: uuid(),
          },
        },
        { status: 400 },
      );
    }

    const site = mockSites.find((s) => s.codeSite === payload.site_code);
    if (!site) {
      return HttpResponse.json(
        { error: { code: 'unknown_site', message: 'Site introuvable', correlationId: uuid() } },
        { status: 404 },
      );
    }

    // Cherche une collection existante par externalId (= id_collecte_sa)
    const existing = mockCollections.find((c) => c.koboSubmissionUuid === payload.id_collecte_sa);
    const now = new Date().toISOString();

    if (existing) {
      // Re-soumission : incrémente la version, archive l'état actuel en revisions.
      existing.revisions = [
        ...(existing.revisions ?? []),
        {
          version: existing.koboVersion,
          submittedAt: existing.syncedAt ?? existing.collectedAt,
          measurementsCount: existing.measurements.length,
          photosCount: existing.photos.length,
          reason: 'correction_requested',
        },
      ];
      existing.koboVersion = (existing.koboVersion ?? 1) + 1;
      existing.syncedAt = now;
      existing.status = hasPendingLabSamples(existing) ? 'awaiting_lab' : 'submitted';
      return HttpResponse.json(
        {
          accepted: true,
          collectionId: existing.id,
          koboVersion: existing.koboVersion,
          isUpdate: true,
        },
        { status: 200 },
      );
    }

    // Nouvelle collection
    const id = `col-${uuid().slice(0, 8)}`;
    const measurements: Measurement[] = Object.entries(payload.mesures ?? {}).map(
      ([indicatorId, value]) => ({
        indicatorId,
        acquisition: value === null ? 'lab_pending' : 'in_situ',
        value,
        unit: '',
      }),
    );
    const created: Collection = {
      id,
      koboSubmissionUuid: payload.id_collecte_sa!,
      koboVersion: payload._version ?? 1,
      siteId: site.id,
      pointPrelevement: payload.point_prelev,
      agentId:
        mockUsers.find((u) => u.koboUsername === payload.agent)?.id ?? 'u-agent-bko',
      collectedAt: payload.date_prelevement!,
      status: measurements.some((m) => m.acquisition === 'lab_pending') ? 'awaiting_lab' : 'submitted',
      syncedAt: now,
      gps: payload.gps_prelevement ?? null,
      measurements,
      photos: [],
      notes: payload.obs_generales,
    };
    mockCollections.push(created);
    return HttpResponse.json(
      { accepted: true, collectionId: id, koboVersion: created.koboVersion, isUpdate: false },
      { status: 201 },
    );
  }),

  /** POST .../lab-samples/:containerId/send — superviseur marque le flacon comme parti au labo. */
  http.post(
    '/api/v1/collections/:id/lab-samples/:containerId/send',
    async ({ params, request }) => {
      await delay(200);
      const item = mockCollections.find((c) => c.id === params.id);
      if (!item) return error404Collection();
      const body = (await request.json()) as { sentBy: string; labId: string };
      const now = new Date().toISOString();
      const chosenLab = mockLabs.find((l) => l.id === body.labId);
      const sla = chosenLab?.slaBusinessDays ?? 10;
      const expectedBy = new Date(Date.now() + sla * 86_400_000).toISOString();
      updateContainer(item, String(params.containerId), (s) => ({
        ...s,
        labId: body.labId,
        status: 'sent',
        sentAt: now,
        expectedBy,
      }));
      // Notifie le labo par e-mail/SMS qu'un flacon est en route
      const notifs = buildLabNotifications(body.labId, 'sample_sent_to_lab');
      item.notifications = [...(item.notifications ?? []), ...notifs];
      return HttpResponse.json(item);
    },
  ),
];

function error404Collection() {
  return HttpResponse.json(
    {
      error: {
        code: 'not_found',
        message: 'Collecte introuvable.',
        correlationId: uuid(),
      },
    },
    { status: 404 },
  );
}

/**
 * Applique un patch à tous les samples partageant un containerId dans la collecte.
 * (Le même flacon est référencé par N measurements.)
 */
function updateContainer(
  collection: Collection,
  containerId: string,
  patcher: (sample: NonNullable<Collection['measurements'][number]['sample']>) =>
    NonNullable<Collection['measurements'][number]['sample']>,
): void {
  for (const m of collection.measurements) {
    if (m.sample && m.sample.containerId === containerId) {
      m.sample = patcher(m.sample);
    }
  }
}
