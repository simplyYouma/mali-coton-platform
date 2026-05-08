/**
 * Journal d'audit — CDC §3.4 "Journalisation complète de toutes les actions
 * sur la plateforme (audit trail)".
 *
 * Chaque entrée trace : qui, quoi, sur quelle ressource, quand, depuis où.
 */

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'site.create'
  | 'site.update'
  | 'collection.submit'
  | 'collection.validate'
  | 'collection.reject'
  | 'collection.lab_result'
  | 'threshold.update';

export interface AuditLogEntry {
  id: string;
  occurredAt: string;
  actorId: string;
  actorName: string;
  actorRole: 'admin' | 'superviseur' | 'agent';
  action: AuditAction;
  resourceType: 'user' | 'site' | 'collection' | 'threshold' | 'auth';
  resourceId: string | null;
  resourceLabel?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}

const now = Date.now();
const minutesAgo = (n: number) => new Date(now - n * 60_000).toISOString();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-001',
    occurredAt: minutesAgo(5),
    actorId: 'u-sup-1',
    actorName: 'Moussa Coulibaly',
    actorRole: 'superviseur',
    action: 'collection.validate',
    resourceType: 'collection',
    resourceId: 'col-0042',
    resourceLabel: 'ATPEK · 2026-04-26',
    ipAddress: '10.42.1.18',
    userAgent: 'Chrome 121 / macOS',
  },
  {
    id: 'audit-002',
    occurredAt: minutesAgo(18),
    actorId: 'u-agent-bko',
    actorName: 'Aïcha Touré',
    actorRole: 'agent',
    action: 'collection.submit',
    resourceType: 'collection',
    resourceId: 'col-0041',
    resourceLabel: 'Dianéguéla · 2026-04-26',
    ipAddress: '197.149.226.32',
    userAgent: 'Mali Coton Tablette · Android 13',
  },
  {
    id: 'audit-003',
    occurredAt: minutesAgo(42),
    actorId: 'u-sup-1',
    actorName: 'Moussa Coulibaly',
    actorRole: 'superviseur',
    action: 'collection.reject',
    resourceType: 'collection',
    resourceId: 'col-0039',
    resourceLabel: 'GALA-NI-MASSIRIW · 2026-04-25',
    ipAddress: '10.42.1.18',
    userAgent: 'Chrome 121 / macOS',
    details: 'pH eaux usées incohérent (relecture demandée à l\'agent)',
  },
  {
    id: 'audit-004',
    occurredAt: minutesAgo(120),
    actorId: 'u-admin-1',
    actorName: 'Awa Diarra',
    actorRole: 'admin',
    action: 'threshold.update',
    resourceType: 'threshold',
    resourceId: 'water.sulfates',
    resourceLabel: 'Sulfates · seuil max',
    ipAddress: '41.221.84.10',
    userAgent: 'Firefox 124 / Windows 11',
    details: '250 → 200 mg/L (alignement Norme malienne MN-03-02/002:2006)',
  },
  {
    id: 'audit-005',
    occurredAt: minutesAgo(180),
    actorId: 'u-sup-1',
    actorName: 'Moussa Coulibaly',
    actorRole: 'superviseur',
    action: 'collection.lab_result',
    resourceType: 'collection',
    resourceId: 'col-0035',
    resourceLabel: 'DJIGUIYASO · 2026-04-25',
    details: 'DBO5 reçu du LNS Bamako · 14.2 mg O₂/L',
  },
  {
    id: 'audit-006',
    occurredAt: daysAgo(1),
    actorId: 'u-admin-1',
    actorName: 'Awa Diarra',
    actorRole: 'admin',
    action: 'user.create',
    resourceType: 'user',
    resourceId: 'u-agent-segou',
    resourceLabel: 'Issa Traoré (agent.segou@sahel.com)',
    ipAddress: '41.221.84.10',
    userAgent: 'Firefox 124 / Windows 11',
    details: 'Affecté au site NDOMO (Ségou)',
  },
  {
    id: 'audit-007',
    occurredAt: daysAgo(1),
    actorId: 'u-agent-segou',
    actorName: 'Issa Traoré',
    actorRole: 'agent',
    action: 'user.login',
    resourceType: 'auth',
    resourceId: null,
    ipAddress: '197.149.83.5',
    userAgent: 'Mali Coton Tablette · Android 13',
  },
  {
    id: 'audit-008',
    occurredAt: daysAgo(2),
    actorId: 'u-admin-1',
    actorName: 'Awa Diarra',
    actorRole: 'admin',
    action: 'site.update',
    resourceType: 'site',
    resourceId: 'site-atpek',
    resourceLabel: 'ATPEK',
    details: 'Mise à jour effectif (270 → 280 membres)',
  },
  {
    id: 'audit-009',
    occurredAt: daysAgo(3),
    actorId: 'u-sup-1',
    actorName: 'Moussa Coulibaly',
    actorRole: 'superviseur',
    action: 'collection.validate',
    resourceType: 'collection',
    resourceId: 'col-0028',
    resourceLabel: 'NDOMO · 2026-04-23',
  },
  {
    id: 'audit-010',
    occurredAt: daysAgo(4),
    actorId: 'u-admin-1',
    actorName: 'Awa Diarra',
    actorRole: 'admin',
    action: 'threshold.update',
    resourceType: 'threshold',
    resourceId: 'air.pm25',
    resourceLabel: 'PM2,5 · seuil 24h',
    details: 'Création seuil 25 µg/m³ (OMS Air Quality 2021)',
  },
];
