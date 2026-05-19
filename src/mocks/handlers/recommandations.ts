import { http, HttpResponse, delay } from 'msw';
import { mockRecommandations } from '../fixtures/recommandations';
import { mockUsers } from '../fixtures/users';
import { mockSites } from '../fixtures/sites';
import type {
  Recommandation,
  RecommandationCreateInput,
  RecommandationNotification,
  RecommandationStatut,
  RecommandationUpdateInput,
} from '@/features/recommandations/api/recommandations.types';
import { appendAuditLog } from '../auditTrail';
import { uuid } from '@/lib/uuid';

/**
 * Résout un nom de responsable (texte libre) vers ses coordonnées (e-mail
 * + téléphone si disponibles). Cherche d'abord dans les users plateforme,
 * puis dans les responsables de site (Site.responsableContact peut être un
 * e-mail OU un téléphone).
 */
function resolveResponsable(
  name: string,
): { email?: string; phone?: string; displayName: string } | null {
  if (!name || !name.trim()) return null;
  const needle = name.toLowerCase().trim();

  // 1. Users plateforme
  const user = mockUsers.find((u) => u.fullName.toLowerCase() === needle);
  if (user) {
    return {
      email: user.email,
      phone: user.phone,
      displayName: user.fullName,
    };
  }

  // 2. Responsable de site (externe à la plateforme)
  const site = mockSites.find(
    (s) => s.responsableName && s.responsableName.toLowerCase() === needle,
  );
  if (site && site.responsableContact) {
    const isEmail = site.responsableContact.includes('@');
    return {
      email: isEmail ? site.responsableContact : undefined,
      phone: isEmail ? undefined : site.responsableContact,
      displayName: site.responsableName ?? name,
    };
  }

  return null;
}

/**
 * Génère les notifications mock à envoyer au responsable d'une recommandation.
 */
function buildRecoNotifications(
  responsable: string,
  kind: RecommandationNotification['kind'],
  statutSnapshot?: RecommandationStatut,
): RecommandationNotification[] {
  const target = resolveResponsable(responsable);
  if (!target) return [];
  const now = new Date().toISOString();
  const out: RecommandationNotification[] = [];
  if (target.email) {
    out.push({
      id: uuid(),
      channel: 'email',
      recipient: target.email,
      recipientName: target.displayName,
      kind,
      statutSnapshot,
      sentAt: now,
      ref: `msg-${uuid().slice(0, 8)}@plateforme.pnud.org`,
    });
  }
  if (target.phone) {
    out.push({
      id: uuid(),
      channel: 'sms',
      recipient: target.phone,
      recipientName: target.displayName,
      kind,
      statutSnapshot,
      sentAt: now,
      ref: `SMS-${uuid().slice(0, 6).toUpperCase()}`,
    });
  }
  return out;
}

const store: Recommandation[] = [...mockRecommandations];

const error404 = (msg: string) =>
  HttpResponse.json(
    { error: { code: 'not_found', message: msg, correlationId: uuid() } },
    { status: 404 },
  );

export const recommandationsHandlers = [
  http.get('/api/v1/recommandations', async ({ request }) => {
    await delay(180);
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const collectionId = url.searchParams.get('collectionId');
    const statut = url.searchParams.get('statut');
    const niveauPriorite = url.searchParams.get('niveauPriorite');

    let items = [...store];
    if (siteId) items = items.filter((r) => r.siteId === siteId);
    if (collectionId) items = items.filter((r) => r.collectionId === collectionId);
    if (statut) items = items.filter((r) => r.statut === statut);
    if (niveauPriorite) items = items.filter((r) => r.niveauPriorite === niveauPriorite);

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return HttpResponse.json({
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
    });
  }),

  http.get('/api/v1/recommandations/:id', async ({ params }) => {
    await delay(120);
    const item = store.find((r) => r.id === params.id);
    if (!item) return error404('Recommandation introuvable.');
    return HttpResponse.json(item);
  }),

  http.post('/api/v1/recommandations', async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as RecommandationCreateInput;
    const now = new Date().toISOString();
    const notifications = body.responsableSuivi
      ? buildRecoNotifications(body.responsableSuivi, 'created')
      : [];
    const created: Recommandation = {
      id: `reco-${uuid().slice(0, 8)}`,
      titre: body.titre,
      description: body.description,
      niveauPriorite: body.niveauPriorite,
      statut: 'proposee',
      siteId: body.siteId,
      collectionId: body.collectionId,
      resultatIndicatorId: body.resultatIndicatorId,
      responsableSuivi: body.responsableSuivi,
      dateEcheance: body.dateEcheance,
      createdAt: now,
      createdBy: body.createdBy,
      notifications,
    };
    store.push(created);
    appendAuditLog({
      actorId: body.createdBy,
      action: 'recommandation.created',
      resourceType: 'recommandation',
      resourceId: created.id,
      resourceLabel: created.titre.slice(0, 60),
    });
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch('/api/v1/recommandations/:id', async ({ params, request }) => {
    await delay(180);
    const idx = store.findIndex((r) => r.id === params.id);
    if (idx === -1) return error404('Recommandation introuvable.');
    const patch = (await request.json()) as RecommandationUpdateInput;
    const current = store[idx];
    if (!current) return error404('Recommandation introuvable.');
    const statutChanged = patch.statut && patch.statut !== current.statut;
    // Génère une notification au responsable si le statut change.
    const newNotifs =
      statutChanged && current.responsableSuivi
        ? buildRecoNotifications(current.responsableSuivi, 'status_changed', patch.statut)
        : [];
    const updated: Recommandation = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
      notifications: [...(current.notifications ?? []), ...newNotifs],
    };
    store[idx] = updated;
    // Actor inconnu côté patch (UI ne le passe pas systématiquement) — on log avec createdBy comme fallback.
    appendAuditLog({
      actorId: current.createdBy ?? 'u-admin-1',
      action: patch.statut === 'resolue' ? 'recommandation.resolved' : 'recommandation.updated',
      resourceType: 'recommandation',
      resourceId: updated.id,
      resourceLabel: updated.titre.slice(0, 60),
    });
    return HttpResponse.json(updated);
  }),

  http.delete('/api/v1/recommandations/:id', async ({ params }) => {
    await delay(120);
    const idx = store.findIndex((r) => r.id === params.id);
    if (idx === -1) return error404('Recommandation introuvable.');
    const removed = store[idx]!;
    store.splice(idx, 1);
    appendAuditLog({
      actorId: removed.createdBy ?? 'u-admin-1',
      action: 'recommandation.deleted',
      resourceType: 'recommandation',
      resourceId: removed.id,
      resourceLabel: removed.titre.slice(0, 60),
    });
    return new HttpResponse(null, { status: 204 });
  }),
];
