import type { AuthenticatedUser } from '@/types/common';

interface MockUser extends AuthenticatedUser {
  /**
   * Mot de passe de connexion. `null` = compte de référentiel qui ne se
   * connecte pas (notif e-mail/SMS, jointure agentId → nom dans la fiche
   * collecte).
   *
   * Les agents terrain en avaient un `null` du temps de KoboCollect. La
   * collecte native (cf. docs/approche-collecte-native.md) fait d'eux les
   * utilisateurs principaux de l'application installée sur tablette : ils se
   * connectent donc désormais à la plateforme.
   */
  password: string | null;
}

export const mockUsers: MockUser[] = [
  {
    id: 'u-admin-1',
    email: 'admin@pnud.org',
    fullName: 'Awa Diarra',
    role: 'admin',
    assignedSiteIds: [],
    locale: 'fr',
    phone: '+22376001122',
    koboUsername: 'awa.diarra',
    password: 'demo',
  },
  {
    id: 'u-sup-1',
    email: 'superviseur@sahel.com',
    fullName: 'Moussa Coulibaly',
    role: 'superviseur',
    assignedSiteIds: ['site-atpek', 'site-dianeguela', 'site-galanimassiriw', 'site-djiguiyaso', 'site-ndomo'],
    locale: 'fr',
    phone: '+22376554477',
    koboUsername: 'm.coulibaly',
    password: 'demo',
  },
  // Agents terrain — saisie des collectes depuis l'application installée sur
  // leur tablette. Servent aussi de référentiel pour la jointure agentId / nom.
  {
    id: 'u-agent-bko',
    email: 'agent.bamako@sahel.com',
    fullName: 'Aïcha Touré',
    role: 'agent',
    assignedSiteIds: ['site-atpek', 'site-dianeguela', 'site-galanimassiriw', 'site-djiguiyaso'],
    locale: 'fr',
    phone: '+22376112233',
    koboUsername: 'aicha.toure',
    password: 'demo',
  },
  {
    id: 'u-agent-segou',
    email: 'agent.segou@sahel.com',
    fullName: 'Issa Traoré',
    role: 'agent',
    assignedSiteIds: ['site-ndomo'],
    locale: 'fr',
    phone: '+22376998877',
    koboUsername: 'issa.traore',
    password: 'demo',
  },
  {
    id: 'u-visitor-1',
    email: 'observateur@pnud.org',
    fullName: 'Observateur PNUD',
    role: 'visitor',
    assignedSiteIds: [],
    locale: 'fr',
    password: 'demo',
  },
];

export function findMockUser(email: string, password: string): AuthenticatedUser | null {
  const user = mockUsers.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password !== null &&
      u.password === password,
  );
  if (!user) return null;
  const { password: _pwd, ...safe } = user;
  return safe;
}
