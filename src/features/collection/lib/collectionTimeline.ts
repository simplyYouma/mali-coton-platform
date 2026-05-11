import type { Collection } from '../api/collection.types';

export interface TimelineEvent {
  id: string;
  label: string;
  when: string;
  who?: string;
  tone:
    | 'kobo'
    | 'kobo_resubmit'
    | 'sample'
    | 'lab'
    | 'sup_validate'
    | 'sup_reject'
    | 'sup_correction'
    | 'notification';
  notes?: string;
}

/**
 * Reconstitue déterministiquement la chronologie d'une collecte à partir
 * de ses champs structurés. Aucun texte hardcodé — tout vient des dates et
 * des références utilisateurs.
 */
export function buildCollectionTimeline(c: Collection): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Soumissions Kobo successives — v1 puis ré-soumissions après correction
  const firstSync = c.revisions?.[0]?.submittedAt ?? c.syncedAt ?? c.collectedAt;
  events.push({
    id: 'submitted',
    label: 'Soumise depuis Kobo',
    when: firstSync,
    who: c.agentId,
    tone: 'kobo',
  });
  if (c.revisions && c.revisions.length > 0) {
    // La version courante est c.koboVersion ; chaque entrée de revisions[] est
    // une version antérieure. La ré-soumission actuelle (=koboVersion) a eu
    // lieu à c.syncedAt.
    events.push({
      id: `kobo-resubmit-v${c.koboVersion}`,
      label: `Ré-soumise depuis Kobo (v${c.koboVersion}) après correction`,
      when: c.syncedAt ?? c.collectedAt,
      who: c.agentId,
      tone: 'kobo_resubmit',
    });
  }

  // 1b. Notifications envoyées à l'agent (e-mail + SMS) — preuves de la boucle
  if (c.notifications && c.notifications.length > 0) {
    // Groupe par sentAt pour éviter de doubler email + sms côte à côte
    const groups = new Map<string, typeof c.notifications>();
    for (const n of c.notifications) {
      const key = `${n.sentAt}|${n.kind}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    }
    for (const [key, group] of groups) {
      const first = group[0]!;
      const channels = group.map((n) => (n.channel === 'email' ? 'e-mail' : 'SMS')).join(' + ');
      const kindLabel =
        first.kind === 'correction_requested'
          ? 'Notification correction envoyée à l\'agent'
          : first.kind === 'rejected'
            ? 'Notification rejet envoyée à l\'agent'
            : 'Notification validation envoyée à l\'agent';
      events.push({
        id: `notif-${key}`,
        label: `${kindLabel} (${channels})`,
        when: first.sentAt,
        tone: 'notification',
      });
    }
  }

  // 2. Échantillons envoyés au labo
  const samples = c.measurements
    .filter((m) => m.sample)
    .map((m) => m.sample!);
  const sentDates = Array.from(new Set(samples.map((s) => s.sentAt))).sort();
  if (sentDates.length > 0) {
    events.push({
      id: 'sample-sent',
      label: `${samples.length} échantillon${samples.length > 1 ? 's' : ''} envoyé${samples.length > 1 ? 's' : ''} au laboratoire`,
      when: sentDates[0]!,
      tone: 'sample',
    });
  }

  // 3. Réception bordereaux labo
  const received = samples.filter((s) => s.receivedAt);
  if (received.length > 0) {
    const lastReceived = received
      .map((s) => s.receivedAt!)
      .sort()
      .pop()!;
    events.push({
      id: 'sample-received',
      label: `${received.length} bordereau${received.length > 1 ? 'x' : ''} reçu${received.length > 1 ? 's' : ''}`,
      when: lastReceived,
      tone: 'lab',
    });
  }

  // 4. Demande de correction
  if (c.correctionRequest) {
    events.push({
      id: 'correction',
      label: 'Demande de correction',
      when: c.correctionRequest.requestedAt,
      who: c.correctionRequest.requestedBy,
      tone: 'sup_correction',
      notes: c.correctionRequest.notes,
    });
  }

  // 5. Validation finale
  if (c.validatedAt) {
    events.push({
      id: 'validated',
      label: 'Validée',
      when: c.validatedAt,
      who: c.validatedBy,
      tone: 'sup_validate',
      notes: c.validationNotes,
    });
  }

  // 6. Rejet
  if (c.status === 'rejected' && c.rejectionReason) {
    /* On n'a pas validatedAt sur un reject — on prend syncedAt + 1 j comme heuristique
     * Si le backend exposait rejectedAt, on l'utiliserait directement. */
    events.push({
      id: 'rejected',
      label: 'Rejetée',
      when: c.validatedAt ?? c.syncedAt ?? c.collectedAt,
      who: c.validatedBy,
      tone: 'sup_reject',
      notes: c.rejectionReason,
    });
  }

  // Tri chronologique
  events.sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());

  return events;
}
