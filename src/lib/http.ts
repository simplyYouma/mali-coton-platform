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
  constructor(status: number, payload: ApiError) {
    super(payload.message);
    this.status = status;
    this.payload = payload;
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

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': contentType,
      Accept: contentType,
      ...authHeader,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  const ct = response.headers.get('Content-Type') ?? '';
  const isJson = ct.includes('json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    // Token expiré ou invalide → signal global (capté par SessionExpiredModal)
    if (response.status === 401) {
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
    throw new HttpError(response.status, errorPayload);
  }

  return data as T;
}
