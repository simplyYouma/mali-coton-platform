import type { AuthenticatedUser, UserRole } from '@/types/common';
import { http } from '@/lib/http';
import { setToken, clearToken, decodeJwtPayload } from '@/lib/tokenStore';
import { unwrapPaginated } from '@/lib/jsonld';
import { API_MODE } from '@/lib/apiConfig';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  token: string;
}

/* ── Réponse brute API Platform JWT ── */
interface JwtLoginResponse {
  token: string;
}

/* ── Structure JWT payload API Platform ── */
interface JwtPayload {
  username?: string;   // email de l'utilisateur
  email?: string;
  roles?: string[];
  exp?: number;
}

/* ── Réponse brute /api/users ── */
interface BackendUser {
  '@id'?: string;
  id: number;
  nom: string;
  prenom: string;
  email: string;
  actif: boolean;
  rolesCollection?: {
    values?: string[];
    keys?: number[];
  };
}

/** Mappe un rôle backend (code Role ou ROLE_XXX) vers notre UserRole. */
function mapRole(raw: string): UserRole {
  const normalized = raw.toLowerCase().replace('role_', '');
  const map: Record<string, UserRole> = {
    admin: 'admin',
    superviseur: 'superviseur',
    supervisor: 'superviseur',
    agent: 'agent',
    lab: 'lab',
    laboratoire: 'lab',
    visitor: 'visitor',
    visiteur: 'visitor',
  };
  return map[normalized] ?? 'visitor';
}

/** Convertit un utilisateur backend en AuthenticatedUser. */
function toAuthUser(u: BackendUser): AuthenticatedUser {
  const rawRoles = u.rolesCollection?.values ?? [];
  const role = rawRoles.length > 0 ? mapRole(rawRoles[0]!) : 'visitor';
  return {
    id: String(u.id),
    email: u.email,
    fullName: `${u.prenom} ${u.nom}`.trim(),
    role,
    assignedSiteIds: [],
    locale: 'fr',
  };
}

/* ── Endpoint login réel API Platform (LexikJWTAuthenticationBundle) ── */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  if (API_MODE === 'mock') {
    // Mode mock : l'ancien handler MSW gère /auth/login
    return http<LoginResponse>('/auth/login', { method: 'POST', body: payload, public: true });
  }

  // 1. Obtenir le token JWT — le backend attend { email, password }
  const { token } = await http<JwtLoginResponse>('/login_check', {
    method: 'POST',
    body: { email: payload.email, password: payload.password },
    public: true,
  });

  // 2. Stocker le token pour les appels suivants
  setToken(token);

  // 3. Décoder le payload JWT : contient { username (= email), roles, iat, exp }
  const jwtPayload = decodeJwtPayload<JwtPayload>(token);
  const email = jwtPayload?.username ?? payload.email;
  // Les rôles viennent directement du JWT (ex. ["ROLE_USER", "ROLE_ADMIN"])
  const jwtRoles = jwtPayload?.roles ?? [];

  // 4. Récupérer les infos utilisateur depuis /api/users
  const raw = await http<unknown>('/users', { query: { email } });
  const page = unwrapPaginated<BackendUser>(raw);
  const backendUser =
    page.items.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? page.items[0];

  if (!backendUser) {
    clearToken();
    throw new Error('Utilisateur introuvable après authentification.');
  }

  // 5. Construire le profil — priorité aux rôles JWT (plus fiables que rolesCollection)
  const role =
    jwtRoles.length > 0
      ? mapRole(jwtRoles.find((r) => r !== 'ROLE_USER') ?? jwtRoles[0]!)
      : mapRole(backendUser.rolesCollection?.values?.[0] ?? 'visitor');

  const user: AuthenticatedUser = {
    id: String(backendUser.id),
    email: backendUser.email,
    fullName: `${backendUser.prenom} ${backendUser.nom}`.trim(),
    role,
    assignedSiteIds: [],
    locale: 'fr',
  };

  return { user, token };
}

export function logout(): void {
  clearToken();
}
