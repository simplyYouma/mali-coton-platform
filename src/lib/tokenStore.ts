/**
 * Stockage isolé du JWT — évite les imports circulaires entre http.ts et AuthProvider.
 * Le token est écrit par AuthProvider au login/logout, lu par http.ts à chaque requête.
 */

const KEY = 'mc.jwt';

export function getToken(): string | null {
  return localStorage.getItem(KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(KEY);
}

/** Retourne true si le token est absent ou si son claim `exp` est dépassé. */
export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  if (!payload?.exp) return false;
  return Date.now() / 1000 > payload.exp;
}

/**
 * Décode le payload d'un JWT sans vérification de signature (côté client uniquement).
 * Retourne null si le token est malformé.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}
