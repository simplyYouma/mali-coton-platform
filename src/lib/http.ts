/**
 * Minimal HTTP client. Centralises base URL, error envelope, JSON parsing.
 * All API access in features must go through this.
 */

import type { ApiError } from '@/types/common';

const API_BASE = '/api/v1';

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
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  const contentType = response.headers.get('Content-Type') ?? '';
  const isJson = contentType.includes('application/json');
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
