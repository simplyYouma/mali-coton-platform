/**
 * Minimal HTTP client. Centralises base URL, error envelope, JSON parsing.
 * All API access in features must go through this.
 *
 * Base URL pilotée par `apiConfig.ts` (mock /api/v1 ou live VITE_API_BASE_URL).
 */

import type { ApiError } from '@/types/common';
import { API_BASE, API_MODE } from './apiConfig';

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
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, ...rest } = options;
  // En mode live, API_BASE peut être une URL absolue. URL() gère les deux cas.
  const baseUrl = API_BASE.startsWith('http')
    ? API_BASE
    : `${window.location.origin}${API_BASE}`;
  const url = new URL(`${baseUrl}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  // API Platform exige Accept: application/ld+json en live ;
  // en mock on garde application/json (handlers MSW).
  const acceptHeader =
    API_MODE === 'live' ? 'application/ld+json' : 'application/json';

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': API_MODE === 'live' ? 'application/ld+json' : 'application/json',
      Accept: acceptHeader,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  const contentType = response.headers.get('Content-Type') ?? '';
  const isJson = contentType.includes('json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorPayload: ApiError = data?.error ?? {
      code: 'unknown_error',
      message: response.statusText,
      correlationId: 'n/a',
    };
    throw new HttpError(response.status, errorPayload);
  }

  return data as T;
}
