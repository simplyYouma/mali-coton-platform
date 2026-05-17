import type { AuthenticatedUser } from '@/types/common';

interface MockUser extends AuthenticatedUser {
  password: string;
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
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!user) return null;
  const { password: _pwd, ...safe } = user;
  return safe;
}
