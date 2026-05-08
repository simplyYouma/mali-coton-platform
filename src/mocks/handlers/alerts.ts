import { http, HttpResponse, delay } from 'msw';
import { uuid } from '@/lib/uuid';
import { mockAlerts } from '../fixtures/alerts';
import type {
  AlertEntry,
  AlertResolveInput,
  AlertAcknowledgeInput,
} from '@/features/alerts/api/alerts.types';

const alertsStore: AlertEntry[] = mockAlerts.map((a) => ({ ...a }));

const error404 = () =>
  HttpResponse.json(
    {
      error: { code: 'not_found', message: 'Alerte introuvable.', correlationId: uuid() },
    },
    { status: 404 },
  );

export const alertsHandlers = [
  http.get('/api/v1/alerts', async ({ request }) => {
    await delay(180);
    const url = new URL(request.url);
    let items = [...alertsStore];
    const severity = url.searchParams.get('severity');
    const status = url.searchParams.get('status');
    const siteId = url.searchParams.get('siteId');
    const category = url.searchParams.get('category');
    if (severity) items = items.filter((a) => a.severity === severity);
    if (status) items = items.filter((a) => a.status === status);
    if (siteId) items = items.filter((a) => a.siteId === siteId);
    if (category) items = items.filter((a) => a.category === category);
    items.sort((a, b) => new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime());
    return HttpResponse.json({
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
    });
  }),

  http.post('/api/v1/alerts/:id/acknowledge', async ({ params, request }) => {
    await delay(150);
    const idx = alertsStore.findIndex((a) => a.id === params.id);
    if (idx === -1) return error404();
    const body = (await request.json()) as AlertAcknowledgeInput;
    const current = alertsStore[idx];
    if (!current) return error404();
    const updated: AlertEntry = {
      ...current,
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: body.acknowledgedBy,
    };
    alertsStore[idx] = updated;
    return HttpResponse.json(updated);
  }),

  http.post('/api/v1/alerts/:id/resolve', async ({ params, request }) => {
    await delay(180);
    const idx = alertsStore.findIndex((a) => a.id === params.id);
    if (idx === -1) return error404();
    const body = (await request.json()) as AlertResolveInput;
    const current = alertsStore[idx];
    if (!current) return error404();
    const updated: AlertEntry = {
      ...current,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: body.resolvedBy,
    };
    alertsStore[idx] = updated;
    return HttpResponse.json(updated);
  }),
];
