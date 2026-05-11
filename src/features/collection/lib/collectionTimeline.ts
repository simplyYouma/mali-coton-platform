import type { Collection } from '../api/collection.types';

export interface TimelineEvent {
  id: string;
  label: string;
  when: string;
  who?: string;
  tone: 'kobo' | 'sample' | 'lab' | 'sup_validate' | 'sup_reject' | 'sup_correction';
  notes?: string;
}

/**
 * Reconstitue déterministiquement la chronologie d'une collecte à partir
 * de ses champs structurés. Aucun texte hardcodé — tout vient des dates et
 * des références utilisateurs.
 */
export function buildCollectionTimeline(c: Collection): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Soumission depuis Kobo
  events.push({
    id: 'submitted',
    label: 'Soumise depuis Kobo',
    when: c.syncedAt ?? c.collectedAt,
    who: c.agentId,
    tone: 'kobo',
  });

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
