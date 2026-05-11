import { http, HttpResponse, delay } from 'msw';
import { uuid } from '@/lib/uuid';
import { mockUsers } from '../fixtures/users';
import { mockThresholds } from '../fixtures/thresholds';
import { mockAuditLogs } from '../fixtures/auditLogs';
import type {
  ManagedUser,
  ThresholdConfig,
  UserCreateInput,
  UserUpdateInput,
  ThresholdUpdateInput,
} from '@/features/admin/api/admin.types';

/**
 * In-memory store admin (CRUD users + édition thresholds + lecture audit).
 * Réinitialisé à chaque reload — suffisant pour la maquette L2.
 */

const usersStore: ManagedUser[] = mockUsers.map((u) => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  role: u.role,
  assignedSiteIds: u.assignedSiteIds,
  locale: u.locale,
  isActive: true,
  createdAt: '2026-01-10T08:00:00.000Z',
  lastLoginAt:
    u.id === 'u-agent-bko' ? new Date(Date.now() - 18 * 60_000).toISOString() : undefined,
  phone: u.phone,
  koboUsername: u.koboUsername,
  labId: u.labId,
}));

const thresholdsStore: ThresholdConfig[] = mockThresholds.map((t) => ({ ...t }));

const error404 = (message: string) =>
  HttpResponse.json(
    {
      error: {
        code: 'not_found',
        message,
        correlationId: uuid(),
      },
    },
    { status: 404 },
  );

export const adminHandlers = [
  /* ───── Users ───── */
  http.get('/api/v1/users', async () => {
    await delay(180);
    return HttpResponse.json({
      items: usersStore,
      total: usersStore.length,
      page: 1,
      pageSize: usersStore.length,
    });
  }),

  http.post('/api/v1/users', async ({ request }) => {
    await delay(220);
    const body = (await request.json()) as UserCreateInput;
    const created: ManagedUser = {
      id: `u-${uuid().slice(0, 8)}`,
      email: body.email,
      fullName: body.fullName,
      role: body.role,
      assignedSiteIds: body.assignedSiteIds,
      locale: body.locale,
      isActive: true,
      createdAt: new Date().toISOString(),
      phone: body.phone,
      koboUsername: body.koboUsername,
      labId: body.labId,
    };
    usersStore.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch('/api/v1/users/:id', async ({ params, request }) => {
    await delay(180);
    const idx = usersStore.findIndex((u) => u.id === params.id);
    if (idx === -1) return error404('Utilisateur introuvable.');
    const patch = (await request.json()) as UserUpdateInput;
    const current = usersStore[idx];
    if (!current) return error404('Utilisateur introuvable.');
    const updated: ManagedUser = { ...current, ...patch };
    usersStore[idx] = updated;
    return HttpResponse.json(updated);
  }),

  http.delete('/api/v1/users/:id', async ({ params }) => {
    await delay(150);
    const idx = usersStore.findIndex((u) => u.id === params.id);
    if (idx === -1) return error404('Utilisateur introuvable.');
    usersStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  /* ───── Thresholds ───── */
  http.get('/api/v1/thresholds', async () => {
    await delay(150);
    return HttpResponse.json({
      items: thresholdsStore,
      total: thresholdsStore.length,
      page: 1,
      pageSize: thresholdsStore.length,
    });
  }),

  http.patch('/api/v1/thresholds/:indicatorId', async ({ params, request }) => {
    await delay(180);
    const idx = thresholdsStore.findIndex((t) => t.indicatorId === params.indicatorId);
    if (idx === -1) return error404('Seuil introuvable.');
    const patch = (await request.json()) as ThresholdUpdateInput;
    const current = thresholdsStore[idx];
    if (!current) return error404('Seuil introuvable.');
    const updated: ThresholdConfig = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    thresholdsStore[idx] = updated;
    return HttpResponse.json(updated);
  }),

  /* ───── Audit logs ───── */
  http.get('/api/v1/audit-logs', async ({ request }) => {
    await delay(220);
    const url = new URL(request.url);
    const actorId = url.searchParams.get('actorId');
    const action = url.searchParams.get('action');
    const resourceType = url.searchParams.get('resourceType');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let items = [...mockAuditLogs];
    if (actorId) items = items.filter((l) => l.actorId === actorId);
    if (action) items = items.filter((l) => l.action === action);
    if (resourceType) items = items.filter((l) => l.resourceType === resourceType);
    if (from) items = items.filter((l) => new Date(l.occurredAt) >= new Date(from));
    if (to) items = items.filter((l) => new Date(l.occurredAt) <= new Date(to));

    return HttpResponse.json({
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
    });
  }),
];
