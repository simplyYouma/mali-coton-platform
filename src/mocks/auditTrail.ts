/**
 * Audit trail runtime — étend `mockAuditLogs` (fixture historique) avec les
 * entrées générées par les mutations en cours de session.
 *
 * Toute mutation sup / admin qui modifie l'état (validation collecte, rejet,
 * correction, recommandation créée/résolue, sample refusé, bordereau renvoyé,
 * etc.) doit appeler `appendAuditLog(...)`.
 *
 * Single source of vérité pour le handler `/api/v1/audit-logs`.
 */
import { mockAuditLogs, type AuditLogEntry, type AuditAction } from './fixtures/auditLogs';
import { mockUsers } from './fixtures/users';
import { uuid } from '@/lib/uuid';

/** Liste mutable, initialisée avec la fixture historique. */
const runtimeLogs: AuditLogEntry[] = [...mockAuditLogs];

interface AppendInput {
  actorId: string;
  action: AuditAction;
  resourceType: AuditLogEntry['resourceType'];
  resourceId: string | null;
  resourceLabel?: string;
}

/**
 * Append une entrée d'audit. Résout actorName + actorRole depuis mockUsers.
 * Idempotent : ne déduplique pas (chaque appel = 1 entrée).
 */
export function appendAuditLog(input: AppendInput): AuditLogEntry {
  const actor = mockUsers.find((u) => u.id === input.actorId);
  const entry: AuditLogEntry = {
    id: `audit-${uuid().slice(0, 8)}`,
    occurredAt: new Date().toISOString(),
    actorId: input.actorId,
    actorName: actor?.fullName ?? input.actorId,
    actorRole: (actor?.role ?? 'admin') as AuditLogEntry['actorRole'],
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    resourceLabel: input.resourceLabel,
  };
  runtimeLogs.unshift(entry); // plus récent en premier
  return entry;
}

/** Lecture pour le handler — retourne une copie triée. */
export function readAuditLogs(): AuditLogEntry[] {
  return [...runtimeLogs].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
