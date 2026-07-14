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
