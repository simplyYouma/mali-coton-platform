/**
 * Handlers MSW pour les ressources backend non encore consommées par le
 * frontend (Phase A3 + Phase B du cahier). Endpoints exposés pour que le
 * mode live ait la même surface API que le backend cible, et que toute
 * exploration via curl / fetch obtienne une réponse paginée propre plutôt
 * qu'un 404 MSW.
 *
 * Couverture :
 * - Hiérarchie admin Mali : regions, cercles, communes
 * - Référentiels : permissions, parametre_unites
 * - Découpage labo : prelevements, echantillons, analyse_laboratoires,
 *   resultat_analyses, validation_superviseurs
 *
 * Les ressources de découpage labo sont volontairement renvoyées vides
 * (le frontend consomme aujourd'hui le format fusionné via Collection).
 * Elles seront seedées au branchement live une fois Phase B implémentée.
 */

import { http, HttpResponse, delay } from 'msw';
import {
  mockRegions,
  mockCercles,
  mockCommunes,
  mockQuartiers,
} from '../fixtures/geography';
import { mockParametreUnites } from '../fixtures/parametreUnites';
import { mockPermissions } from '../fixtures/permissions';

function paginate<T>(items: T[]) {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: items.length,
  };
}

function emptyPage() {
  return paginate<never>([]);
}

export const structuralsHandlers = [
  // ── Hiérarchie administrative (Phase A3) ─────────────────────────────
  http.get('/api/v1/regions', async () => {
    await delay(100);
    return HttpResponse.json(paginate(mockRegions));
  }),
  http.get('/api/v1/regions/:id', async ({ params }) => {
    await delay(80);
    const item = mockRegions.find((r) => r.id === params.id);
    return item ? HttpResponse.json(item) : new HttpResponse(null, { status: 404 });
  }),

  http.get('/api/v1/cercles', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const regionId = url.searchParams.get('regionId');
    const items = regionId
      ? mockCercles.filter((c) => c.regionId === regionId)
      : mockCercles;
    return HttpResponse.json(paginate(items));
  }),
  http.get('/api/v1/cercles/:id', async ({ params }) => {
    await delay(80);
    const item = mockCercles.find((c) => c.id === params.id);
    return item ? HttpResponse.json(item) : new HttpResponse(null, { status: 404 });
  }),

  http.get('/api/v1/communes', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const cercleId = url.searchParams.get('cercleId');
    const items = cercleId
      ? mockCommunes.filter((c) => c.cercleId === cercleId)
      : mockCommunes;
    return HttpResponse.json(paginate(items));
  }),
  http.get('/api/v1/communes/:id', async ({ params }) => {
    await delay(80);
    const item = mockCommunes.find((c) => c.id === params.id);
    return item ? HttpResponse.json(item) : new HttpResponse(null, { status: 404 });
  }),

  http.get('/api/v1/quartiers', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const communeId = url.searchParams.get('communeId');
    const items = communeId
      ? mockQuartiers.filter((q) => q.communeId === communeId)
      : mockQuartiers;
    return HttpResponse.json(paginate(items));
  }),
  http.get('/api/v1/quartiers/:id', async ({ params }) => {
    await delay(80);
    const item = mockQuartiers.find((q) => q.id === params.id);
    return item ? HttpResponse.json(item) : new HttpResponse(null, { status: 404 });
  }),

  // ── Référentiels (RBAC + unités) ────────────────────────────────────
  http.get('/api/v1/permissions', async () => {
    await delay(80);
    return HttpResponse.json(paginate(mockPermissions));
  }),

  http.get('/api/v1/parametre_unites', async () => {
    await delay(80);
    return HttpResponse.json(paginate(mockParametreUnites));
  }),

  // ── Découpage labo (Phase B) — volontairement vide pour l'instant ────
  http.get('/api/v1/prelevements', async () => {
    await delay(120);
    return HttpResponse.json(emptyPage());
  }),
  http.get('/api/v1/echantillons', async () => {
    await delay(120);
    return HttpResponse.json(emptyPage());
  }),
  http.get('/api/v1/analyse_laboratoires', async () => {
    await delay(120);
    return HttpResponse.json(emptyPage());
  }),
  http.get('/api/v1/resultat_analyses', async () => {
    await delay(120);
    return HttpResponse.json(emptyPage());
  }),
  http.get('/api/v1/validation_superviseurs', async () => {
    await delay(120);
    return HttpResponse.json(emptyPage());
  }),
];
