/**
 * Minimal HTTP client. Centralises base URL, auth token, error envelope, JSON parsing.
 * All API access in features must go through this.
 *
 * Base URL pilotée par `apiConfig.ts` (mock /api/v1 ou live VITE_API_BASE_URL).
 * JWT Bearer token lu depuis `tokenStore.ts` et injecté automatiquement en live.
 */

import type { ApiError } from '@/types/common';
import { API_BASE, API_MODE } from './apiConfig';
import { getToken } from './tokenStore';

export class HttpError extends Error {
  status: number;
  payload: ApiError;
  /**
   * Corps de réponse brut tel que parsé.
   *
   * `payload` est normalisé pour l'affichage et ne retient qu'un message ; les
   * erreurs de validation 422 portent le détail par champ, qui serait perdu.
   */
  body: unknown;
  constructor(status: number, payload: ApiError, body?: unknown) {
    super(payload.message);
    this.status = status;
    this.payload = payload;
    this.body = body;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Passer true pour les endpoints publics (login) qui ne nécessitent pas de token. */
  public?: boolean;
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, public: isPublic, ...rest } = options;

  const baseUrl = API_BASE.startsWith('http')
    ? API_BASE
    : `${window.location.origin}${API_BASE}`;
  const url = new URL(`${baseUrl}${path}`);

  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  // API Platform exige application/ld+json en live ; MSW accepte application/json.
  const contentType = API_MODE === 'live' ? 'application/ld+json' : 'application/json';

  // Injection du Bearer token JWT (live uniquement, sauf endpoints publics).
  const authHeader: Record<string, string> = {};
  if (API_MODE === 'live' && !isPublic) {
    const token = getToken();
    if (token) authHeader['Authorization'] = `Bearer ${token}`;
  }

  /* Un FormData porte sa propre frontière multipart : lui imposer un
   * Content-Type JSON casserait l'upload, et le sérialiser le viderait. */
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const response = await fetch(url.toString(), {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': contentType }),
      Accept: contentType,
      ...authHeader,
      ...headers,
    },
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  const ct = response.headers.get('Content-Type') ?? '';
  const isJson = ct.includes('json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    /* Token expiré ou invalide → signal global (capté par SessionExpiredModal).
     *
     * Uniquement si la requête portait effectivement un jeton : sur
     * /login_check, un 401 signifie que les identifiants sont faux. Annoncer
     * une « session expirée » à quelqu'un qui n'est pas encore connecté
     * masquait le vrai message et laissait croire à une panne. */
    if (response.status === 401 && authHeader['Authorization']) {
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    }
    // API Platform renvoie les erreurs sous forme {"hydra:description": "..."} ou {"message": "..."}
    const message: string =
      data?.['hydra:description'] ??
      data?.message ??
      data?.error?.message ??
      response.statusText;
    const errorPayload: ApiError = {
      code: String(response.status),
      message,
      correlationId: 'n/a',
    };
    throw new HttpError(response.status, errorPayload, data);
  }

  return data as T;
}
