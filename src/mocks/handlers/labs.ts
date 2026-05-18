import { http, HttpResponse, delay } from 'msw';
import { mockLabs } from '../fixtures/labs';
import { uuid } from '@/lib/uuid';
import type { Lab } from '@/features/collection/api/labs.types';

export const labsHandlers = [
  http.get('/api/v1/labs', async () => {
    await delay(150);
    const items = mockLabs.filter((l) => l.isActive);
    return HttpResponse.json({ items, total: items.length, page: 1, pageSize: items.length });
  }),

  http.get('/api/v1/labs/:id', async ({ params }) => {
    await delay(100);
    const item = mockLabs.find((l) => l.id === params.id);
    if (!item) {
      return HttpResponse.json(
        {
          error: {
            code: 'not_found',
            message: 'Laboratoire introuvable.',
            correlationId: uuid(),
          },
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(item);
  }),

  http.post('/api/v1/labs', async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as Partial<Lab>;
    const created: Lab = {
      id: `lab.${(body.name ?? 'nouveau').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}-${uuid().slice(0, 4)}`,
      name: body.name ?? 'Nouveau laboratoire',
      city: body.city ?? '',
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      slaBusinessDays: body.slaBusinessDays ?? 10,
      capabilities: body.capabilities ?? ['water_chem'],
      isActive: true,
    };
    mockLabs.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
];
