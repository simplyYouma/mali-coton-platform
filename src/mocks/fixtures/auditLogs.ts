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
  | 'role.update'
  | 'site.create'
  | 'site.update'
  | 'collection.import'
  | 'collection.submit'
  | 'collection.validate'
  | 'collection.reject'
  | 'collection.correction_requested'
  | 'collection.lab_result'
  | 'sample.sent'
  | 'sample.received'
  | 'sample.refused_by_lab'
  | 'sample.transmitted'
  | 'sample.bordereau_rejected'
  | 'recommandation.created'
  | 'recommandation.updated'
  | 'recommandation.resolved'
  | 'recommandation.deleted'
  | 'lab.created'
  | 'report.generated'
  | 'threshold.update'
  | 'alert.acknowledged'
  | 'alert.resolved'
  | 'kobo.ingestion';

export interface AuditLogEntry {
  id: string;
  occurredAt: string;
  actorId: string;
  actorName: string;
  actorRole: 'admin' | 'superviseur' | 'agent' | 'lab' | 'visitor';
  action: AuditAction;
  resourceType: 'user' | 'role' | 'site' | 'collection' | 'sample' | 'recommandation' | 'lab' | 'report' | 'threshold' | 'alert' | 'auth';
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
    userAgent: 'Kobo Collect · Android 13',
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
    userAgent: 'Kobo Collect · Android 13',
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
  {
    id: 'audit-011',
    occurredAt: minutesAgo(8),
    actorId: 'u-lab-1',
    actorName: 'Laboratoire National des Eaux',
    actorRole: 'lab',
    action: 'sample.transmitted',
    resourceType: 'sample',
    resourceId: 'SMPL-2026-0214',
    resourceLabel: 'Sulfates · ATPEK · 4 332 mg/L',
    ipAddress: '41.221.78.114',
    userAgent: 'Chrome 121 / Windows 11',
    details: 'Bordereau certifié joint · transmis au superviseur',
  },
  {
    id: 'audit-012',
    occurredAt: minutesAgo(35),
    actorId: 'u-sup-1',
    actorName: 'Moussa Coulibaly',
    actorRole: 'superviseur',
    action: 'collection.correction_requested',
    resourceType: 'collection',
    resourceId: 'col-0061',
    resourceLabel: 'Galanimassiriw · 2026-05-06',
    ipAddress: '10.42.1.18',
    details: 'pH 12,4 implausible — étapes Eaux & GPS/photos à revoir',
  },
  {
    id: 'audit-013',
    occurredAt: minutesAgo(75),
    actorId: 'u-admin-1',
    actorName: 'Awa Diarra',
    actorRole: 'admin',
    action: 'report.generated',
    resourceType: 'report',
    resourceId: 'rpt-2026-04',
    resourceLabel: 'Bilan mensuel · Avril 2026 · multi-sites',
    details: 'Export PDF + XLSX · 18 collectes incluses',
  },
  {
    id: 'audit-014',
    occurredAt: minutesAgo(95),
    actorId: 'u-admin-1',
    actorName: 'Awa Diarra',
    actorRole: 'admin',
    action: 'collection.import',
    resourceType: 'collection',
    resourceId: 'batch-2026-05-04',
    resourceLabel: 'Lot Kobo · 12 collectes',
    details: 'Source : Kobo · 11 ok · 1 rejetée (siteId inconnu)',
  },
  {
    id: 'audit-015',
    occurredAt: minutesAgo(140),
    actorId: 'u-sup-1',
    actorName: 'Moussa Coulibaly',
    actorRole: 'superviseur',
    action: 'alert.acknowledged',
    resourceType: 'alert',
    resourceId: 'alert-2026-1142',
    resourceLabel: 'pH > 8,5 · Dianéguéla',
    ipAddress: '10.42.1.18',
  },
  {
    id: 'audit-016',
    occurredAt: minutesAgo(220),
    actorId: 'u-sup-1',
    actorName: 'Moussa Coulibaly',
    actorRole: 'superviseur',
    action: 'alert.resolved',
    resourceType: 'alert',
    resourceId: 'alert-2026-1138',
    resourceLabel: 'PM2,5 > 25 µg/m³ · ATPEK',
    details: 'Délai résolution : 14 h',
  },
  {
    id: 'audit-017',
    occurredAt: daysAgo(1.2),
    actorId: 'u-admin-1',
    actorName: 'Awa Diarra',
    actorRole: 'admin',
    action: 'role.update',
    resourceType: 'role',
    resourceId: 'lab',
    resourceLabel: 'Agent laboratoire',
    details: 'Permission Saisie résultats · none → write',
  },
  {
    id: 'audit-018',
    occurredAt: daysAgo(1.5),
    actorId: 'u-lab-1',
    actorName: 'Laboratoire National des Eaux',
    actorRole: 'lab',
    action: 'user.login',
    resourceType: 'auth',
    resourceId: null,
    ipAddress: '41.221.78.114',
    userAgent: 'Chrome 121 / Windows 11',
  },
  {
    id: 'audit-019',
    occurredAt: daysAgo(2.3),
    actorId: 'u-admin-1',
    actorName: 'Awa Diarra',
    actorRole: 'admin',
    action: 'report.generated',
    resourceType: 'report',
    resourceId: 'rpt-2026-q1',
    resourceLabel: 'Rapport trimestriel · T1 2026',
    details: 'Export PDF · 22 pages · audience comité de pilotage',
  },
  {
    id: 'audit-020',
    occurredAt: daysAgo(3.8),
    actorId: 'u-admin-1',
    actorName: 'Awa Diarra',
    actorRole: 'admin',
    action: 'role.update',
    resourceType: 'role',
    resourceId: 'visitor',
    resourceLabel: 'Observateur',
    details: 'Permission Cartographie · none → read',
  },
  /* Echantillon supplementaire de rejets recents — refletent les motifs
   * realistes appliques sur les fixtures collectes (cf. REJECTION_REASONS
   * dans mocks/fixtures/collections.ts). */
  {
    id: 'audit-021',
    occurredAt: daysAgo(5.2),
    actorId: 'u-sup-1',
    actorName: 'Moussa Coulibaly',
    actorRole: 'superviseur',
    action: 'collection.reject',
    resourceType: 'collection',
    resourceId: 'col-0017',
    resourceLabel: 'ATPEK · 2026-04-12',
    ipAddress: '10.42.1.18',
    userAgent: 'Chrome 121 / macOS',
    details:
      'Sulfates labo = 8 520 mg/L = 4× le pic historique du site. Bordereau renvoyé au LNE pour ré-analyse en duplicate.',
  },
  {
    id: 'audit-022',
    occurredAt: daysAgo(7.4),
    actorId: 'u-sup-1',
    actorName: 'Moussa Coulibaly',
    actorRole: 'superviseur',
    action: 'collection.reject',
    resourceType: 'collection',
    resourceId: 'col-0024',
    resourceLabel: 'Dianéguéla · 2026-04-10',
    ipAddress: '10.42.1.18',
    userAgent: 'Chrome 121 / macOS',
    details:
      'Photo de l\'effluent floue, point GPS hors enceinte du site (50 m de décalage). Re-soumission requise avec preuves visuelles claires.',
  },
  {
    id: 'audit-023',
    occurredAt: daysAgo(12.6),
    actorId: 'u-sup-1',
    actorName: 'Moussa Coulibaly',
    actorRole: 'superviseur',
    action: 'collection.reject',
    resourceType: 'collection',
    resourceId: 'col-0046',
    resourceLabel: 'GALA-NI-MASSIRIW · 2026-04-05',
    ipAddress: '10.42.1.18',
    userAgent: 'Chrome 121 / macOS',
    details:
      'Conductivité in-situ 12 800 µS/cm incohérente avec turbidité 8 NTU. Probable confusion entre flacons effluent et cours d\'eau amont.',
  },
];
