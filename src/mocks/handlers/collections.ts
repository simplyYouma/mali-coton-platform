import { http, HttpResponse, delay } from 'msw';
import { mockCollections } from '../fixtures/collections';
import { mockUsers } from '../fixtures/users';
import {
  hasPendingLabSamples,
  type Collection,
  type CollectionNotification,
} from '@/features/collection/api/collection.types';
import { uuid } from '@/lib/uuid';

/**
 * Génère les notifications mock à envoyer à l'agent suite à une action
 * superviseur (correction demandée / rejet / validation). Sans serveur SMTP
 * ni passerelle SMS, on consigne juste les envois — c'est le bon réflexe pour
 * une maquette : le contrat de notification est tracé, le contenu reste à
 * générer par la couche transport en prod.
 */
function buildNotifications(
  agentId: string,
  kind: CollectionNotification['kind'],
): CollectionNotification[] {
  const agent = mockUsers.find((u) => u.id === agentId);
  if (!agent) return [];
  const now = new Date().toISOString();
  const notifs: CollectionNotification[] = [];
  if (agent.email) {
    notifs.push({
      id: uuid(),
      channel: 'email',
      recipient: agent.email,
      recipientUserId: agent.id,
      kind,
      sentAt: now,
      ref: `msg-${uuid().slice(0, 8)}@plateforme.pnud.org`,
    });
  }
  if (agent.phone) {
    notifs.push({
      id: uuid(),
      channel: 'sms',
      recipient: agent.phone,
      recipientUserId: agent.id,
      kind,
      sentAt: now,
      ref: `SMS-${uuid().slice(0, 6).toUpperCase()}`,
    });
  }
  return notifs;
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
];
