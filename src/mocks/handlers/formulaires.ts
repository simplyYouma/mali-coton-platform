import { http, HttpResponse, delay } from 'msw';
import { mockFormulaires, mockSoumissions } from '../fixtures/formulaires';
import type { FormulaireCollecte, SoumissionFormulaire } from '@/features/formulaires/api/formulaires.types';
import { uuid } from '@/lib/uuid';

const formulaireStore: FormulaireCollecte[] = [...mockFormulaires];
const soumissionStore: SoumissionFormulaire[] = [...mockSoumissions];

let nextSoumissionId = 2000;

export const formulairesHandlers = [
  /* ── GET /api/v1/formulaires ── */
  http.get('/api/v1/formulaires', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const typeFormulaire = url.searchParams.get('typeFormulaire');
    const actif = url.searchParams.get('actif');
    const statut = url.searchParams.get('statut');

    let items = [...formulaireStore];
    if (typeFormulaire) items = items.filter((f) => f.typeFormulaire === typeFormulaire);
    if (actif !== null) items = items.filter((f) => String(f.actif) === actif);
    if (statut) items = items.filter((f) => f.statut === statut);

    return HttpResponse.json({ items, total: items.length, page: 1, pageSize: items.length });
  }),

  /* ── GET /api/v1/formulaires/:id ── */
  http.get('/api/v1/formulaires/:id', async ({ params }) => {
    await delay(150);
    const formulaire = formulaireStore.find((f) => String(f.id) === params.id);
    if (!formulaire) {
      return HttpResponse.json(
        { error: { code: 'not_found', message: 'Formulaire introuvable.', correlationId: uuid() } },
        { status: 404 },
      );
    }
    return HttpResponse.json(formulaire);
  }),

  /* ── GET /api/v1/soumissions ── */
  http.get('/api/v1/soumissions', async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const statut = url.searchParams.get('statut');
    const soumisPar = url.searchParams.get('soumisPar');
    const formulaireId = url.searchParams.get('formulaireId');

    let items = [...soumissionStore];
    if (statut) items = items.filter((s) => s.statut === statut);
    if (soumisPar) items = items.filter((s) => s.soumisPar.toLowerCase().includes(soumisPar.toLowerCase()));
    if (formulaireId) items = items.filter((s) => String(s.formulaire.id) === formulaireId);

    items = items.sort(
      (a, b) => new Date(b.dateSoumission).getTime() - new Date(a.dateSoumission).getTime(),
    );

    return HttpResponse.json({ items, total: items.length, page: 1, pageSize: items.length });
  }),

  /* ── GET /api/v1/soumissions/:id ── */
  http.get('/api/v1/soumissions/:id', async ({ params }) => {
    await delay(150);
    const soumission = soumissionStore.find((s) => String(s.id) === params.id);
    if (!soumission) {
      return HttpResponse.json(
        { error: { code: 'not_found', message: 'Soumission introuvable.', correlationId: uuid() } },
        { status: 404 },
      );
    }
    return HttpResponse.json(soumission);
  }),

  /* ── POST /api/v1/soumissions ── */
  http.post('/api/v1/soumissions', async ({ request }) => {
    await delay(350);
    const body = (await request.json()) as Partial<SoumissionFormulaire> & { formulaireId?: number };

    const formulaireId = body.formulaireId ?? (body.formulaire as { id: number } | undefined)?.id;
    const formulaire = formulaireStore.find((f) => f.id === formulaireId);

    if (!formulaire) {
      return HttpResponse.json(
        { error: { code: 'invalid_payload', message: 'Formulaire introuvable.', correlationId: uuid() } },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const newSoumission: SoumissionFormulaire = {
      id: nextSoumissionId++,
      formulaire: {
        id: formulaire.id,
        titre: formulaire.titre,
        code: formulaire.code,
        typeFormulaire: formulaire.typeFormulaire,
        statut: formulaire.statut,
      },
      siteTeinture: body.siteTeinture,
      collecteTerrain: body.collecteTerrain,
      soumisPar: body.soumisPar ?? 'Inconnu',
      statut: 'soumis',
      source: body.source ?? 'plateforme',
      latitude: body.latitude,
      longitude: body.longitude,
      dateSoumission: body.dateSoumission ?? now,
      createdAt: now,
      updatedAt: now,
      reponses: (body.reponses ?? []).map((r, i) => {
        const champ = formulaire.champs.find((c) => c.id === r.champId);
        return {
          id: 5000 + i,
          champId: r.champId,
          libelle: champ?.libelle ?? `Champ ${r.champId}`,
          typeChamp: champ?.typeChamp ?? 'texte',
          valeurTexte: r.valeurTexte,
          valeurNombre: r.valeurNombre,
          valeurDate: r.valeurDate,
          valeurJson: r.valeurJson,
          fichierUrl: r.fichierUrl,
        };
      }),
    };

    soumissionStore.unshift(newSoumission);
    return HttpResponse.json(newSoumission, { status: 201 });
  }),
];
