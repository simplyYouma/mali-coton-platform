import type { AuthenticatedUser, UserRole } from '@/types/common';
import { http } from '@/lib/http';
import { setToken, clearToken, decodeJwtPayload } from '@/lib/tokenStore';
import { fetchMe, nomComplet } from './me';
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

/**
 * Code de rôle backend → `UserRole` du client, pour l'affichage seul.
 *
 * Les codes sont incohérents en base (`ROLE_ADMIN`, mais `superviseur` sans
 * préfixe) : cette table sert à étiqueter l'utilisateur, jamais à lui accorder
 * un droit — les autorisations viennent de `profil.permissions`.
 */
function mapRole(raw: string): UserRole {
  const normalized = raw.toLowerCase().replace('role_', '');
  const map: Record<string, UserRole> = {
    admin: 'admin',
    superviseur: 'superviseur',
    supervisor: 'superviseur',
    agent: 'agent',
    agent_collecteur: 'agent',
    lab: 'lab',
    laboratoire: 'lab',
    visitor: 'visitor',
    visiteur: 'visitor',
  };
  return map[normalized] ?? 'visitor';
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

  /* 4. Profil via /api/me — seul endpoint ouvert à tout compte authentifié.
   *    /api/users exige `utilisateur.manage` et aurait interdit la connexion à
   *    un agent collecteur. */
  const profil = await fetchMe();

  /* 5. `role` ne sert plus qu'à l'affichage et aux quelques écrans encore
   *    câblés dessus : les autorisations se lisent dans `profil.permissions`
   *    via AuthzProvider. Les codes de rôle étant incohérents en base, on
   *    prend le premier code reconnu, sans jamais en déduire de droit. */
  const codesRole = profil.roles.length > 0 ? profil.roles : jwtRoles;
  const role = mapRole(codesRole.find((r) => r !== 'ROLE_USER') ?? codesRole[0] ?? 'visitor');

  const user: AuthenticatedUser = {
    id: String(profil.id),
    email: profil.email || email,
    fullName: nomComplet(profil) || email,
    role,
    assignedSiteIds: [],
    locale: 'fr',
  };

  return { user, token };
}

export function logout(): void {
  clearToken();
}
