import { http, HttpResponse, delay } from 'msw';
import { mockIndicators } from '../fixtures/indicators';
import { uuid } from '@/lib/uuid';
import type { Indicator } from '@/features/collection/api/collection.types';

/* Store muté en mémoire (CRUD admin) */
const store: Indicator[] = mockIndicators.map((i) => ({ ...i, isActive: i.isActive ?? true }));

export const indicatorsHandlers = [
  http.get('/api/v1/indicators', async () => {
    await delay(150);
    return HttpResponse.json({
      items: store,
      total: store.length,
      page: 1,
      pageSize: store.length,
    });
  }),

  http.post('/api/v1/indicators', async ({ request }) => {
    await delay(220);
    const input = (await request.json()) as Partial<Indicator>;
    if (!input.label || !input.domain) {
      return HttpResponse.json(
        {
          error: {
            code: 'invalid_payload',
            message: 'Libellé et domaine obligatoires.',
            correlationId: uuid(),
          },
        },
        { status: 400 },
      );
    }
    const newIndicator: Indicator = {
      id: input.id ?? `ind-custom-${uuid().slice(0, 6)}`,
      domain: input.domain,
      label: input.label,
      unit: input.unit ?? '',
      method: input.method ?? 'Saisie manuelle',
      source: input.source ?? 'Personnalisé (admin)',
      labOnly: input.labOnly,
      minOk: input.minOk,
      maxOk: input.maxOk,
      isActive: true,
      isCustom: true,
    };
    store.unshift(newIndicator);
    return HttpResponse.json(newIndicator, { status: 201 });
  }),

  http.patch('/api/v1/indicators/:id', async ({ params, request }) => {
    await delay(180);
    const idx = store.findIndex((i) => i.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'not_found',
            message: 'Indicateur introuvable.',
            correlationId: uuid(),
          },
        },
        { status: 404 },
      );
    }
    const patch = (await request.json()) as Partial<Indicator>;
    const current = store[idx]!;
    store[idx] = { ...current, ...patch, id: current.id };
    return HttpResponse.json(store[idx]);
  }),

  http.delete('/api/v1/indicators/:id', async ({ params }) => {
    await delay(150);
    const idx = store.findIndex((i) => i.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'not_found',
            message: 'Indicateur introuvable.',
            correlationId: uuid(),
          },
        },
        { status: 404 },
      );
    }
    /* Sécurité : un indicateur du référentiel CDC ne peut être supprimé,
     * seulement désactivé (isActive: false). Seuls les custom sont vraiment
     * supprimés. */
    const target = store[idx]!;
    if (!target.isCustom) {
      return HttpResponse.json(
        {
          error: {
            code: 'forbidden',
            message:
              'Indicateur du référentiel CDC : utilisez "Désactiver" plutôt que "Supprimer".',
            correlationId: uuid(),
          },
        },
        { status: 403 },
      );
    }
    store.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
