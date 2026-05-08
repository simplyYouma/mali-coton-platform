import { http, HttpResponse, delay } from 'msw';
import { mockLabs } from '../fixtures/labs';
import { uuid } from '@/lib/uuid';

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
];
