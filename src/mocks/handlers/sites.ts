import { http, HttpResponse, delay } from 'msw';
import { mockSites } from '../fixtures/sites';
import { uuid } from '@/lib/uuid';
import type { Site } from '@/features/sites/api/site.types';

/* Mutation in-memory store (fixtures are mutated for the session) */
const store: Site[] = [...mockSites];

const NEUTRAL_CONFORMITY = {
  water: 'conforming',
  soil: 'conforming',
  air: 'conforming',
  waste: 'conforming',
  health: 'conforming',
} as const;

export const sitesHandlers = [
  http.get('/api/v1/sites', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const conformity = url.searchParams.get('conformity');
    const type = url.searchParams.get('type');
    const q = url.searchParams.get('q')?.toLowerCase();

    let items = [...store];
    if (conformity) items = items.filter((s) => s.conformity === conformity);
    if (type) items = items.filter((s) => s.type === type);
    if (q) {
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.shortName.toLowerCase().includes(q) ||
          s.location.commune.toLowerCase().includes(q),
      );
    }

    return HttpResponse.json({
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
    });
  }),

  http.get('/api/v1/sites/:id', async ({ params }) => {
    await delay(150);
    const site = store.find((s) => s.id === params.id);
    if (!site) {
      return HttpResponse.json(
        {
          error: {
            code: 'not_found',
            message: 'Site introuvable.',
            correlationId: uuid(),
          },
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(site);
  }),

  http.post('/api/v1/sites', async ({ request }) => {
    await delay(280);
    const input = (await request.json()) as Partial<Site>;

    if (!input.name || !input.shortName || !input.coordinates) {
      return HttpResponse.json(
        {
          error: {
            code: 'invalid_payload',
            message: 'Nom, code court et coordonnées GPS sont obligatoires.',
            correlationId: uuid(),
          },
        },
        { status: 400 },
      );
    }

    const newSite: Site = {
      id: `site-${uuid().slice(0, 8)}`,
      codeSite: input.codeSite ?? `SITE-${uuid().slice(0, 6).toUpperCase()}`,
      name: input.name,
      shortName: input.shortName,
      legalStatus: input.legalStatus ?? 'informel',
      location: input.location ?? { commune: '', city: '' },
      coordinates: input.coordinates,
      type: input.type ?? 'GALA',
      workforce: input.workforce ?? 0,
      createdYear: input.createdYear ?? new Date().getFullYear(),
      isReference: !!input.isReference,
      description: input.description,
      photos: [],
      conformity: 'conforming',
      conformityByDomain: { ...NEUTRAL_CONFORMITY },
      lastCollectionAt: null,
      collectionsCount: 0,
    };

    store.unshift(newSite);
    return HttpResponse.json(newSite, { status: 201 });
  }),

  http.put('/api/v1/sites/:id', async ({ params, request }) => {
    await delay(220);
    const idx = store.findIndex((s) => s.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'not_found',
            message: 'Site introuvable.',
            correlationId: uuid(),
          },
        },
        { status: 404 },
      );
    }
    const patch = (await request.json()) as Partial<Site>;
    const current = store[idx]!;
    const next: Site = {
      ...current,
      ...patch,
      location: { ...current.location, ...(patch.location ?? {}) },
      coordinates: { ...current.coordinates, ...(patch.coordinates ?? {}) },
      id: current.id,
    };
    store[idx] = next;
    return HttpResponse.json(next);
  }),

  http.delete('/api/v1/sites/:id', async ({ params }) => {
    await delay(180);
    const idx = store.findIndex((s) => s.id === params.id);
    if (idx === -1) {
      return HttpResponse.json(
        {
          error: {
            code: 'not_found',
            message: 'Site introuvable.',
            correlationId: uuid(),
          },
        },
        { status: 404 },
      );
    }
    store.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
