import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Beaker, CheckCircle2 } from 'lucide-react';
import {
  Button,
  FormField,
  Input,
  PageHeader,
  Skeleton,
} from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { formatDateTime } from '@/lib/format';
import type { Measurement } from '../api/collection.types';
import { findRule } from '../lib/indicatorRules';
import { useCollection } from '../hooks/useCollections';
import { useLabs } from '../hooks/useLabs';
import { usePatchMeasurement } from '../hooks/useCollectionMutations';

import styles from './LabResultsPage.module.css';

interface LocalEntry {
  value: string;
  receivedAt: string;
  bordereauUrl: string;
}

function isPending(m: Measurement): boolean {
  return m.acquisition === 'lab_pending';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LabResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: collection, isLoading } = useCollection(id);
  const { data: labs } = useLabs();
  const patchMeasurement = usePatchMeasurement();

  const labsById = useMemo(() => {
    const map = new Map<string, string>();
    (labs ?? []).forEach((l) => map.set(l.id, `${l.name} — ${l.city}`));
    return map;
  }, [labs]);

  const pending = useMemo(
    () => collection?.measurements.filter(isPending) ?? [],
    [collection],
  );

  const [entries, setEntries] = useState<Record<string, LocalEntry>>({});

  const updateEntry = (indicatorId: string, patch: Partial<LocalEntry>) => {
    setEntries((prev) => ({
      ...prev,
      [indicatorId]: {
        value: prev[indicatorId]?.value ?? '',
        receivedAt: prev[indicatorId]?.receivedAt ?? todayIso(),
        bordereauUrl: prev[indicatorId]?.bordereauUrl ?? '',
        ...patch,
      },
    }));
  };

  const handleSave = async (indicatorId: string) => {
    if (!collection) return;
    const entry = entries[indicatorId];
    if (!entry || !entry.value.trim()) {
      toast.error('Saisissez la valeur du bordereau avant d\'enregistrer.');
      return;
    }
    const numeric = Number(entry.value);
    const finalValue = Number.isNaN(numeric) ? entry.value : numeric;

    const measurement = collection.measurements.find((m) => m.indicatorId === indicatorId);
    const updatedSample = {
      ...(measurement?.sample ?? {
        sampleId: '',
        containerId: '',
        labId: '',
        status: 'bordereau_returned' as const,
        sentAt: new Date().toISOString(),
      }),
      receivedAt: entry.receivedAt
        ? new Date(entry.receivedAt).toISOString()
        : new Date().toISOString(),
      bordereauUrl: entry.bordereauUrl || undefined,
    };

    try {
      await patchMeasurement.mutateAsync({
        collectionId: collection.id,
        indicatorId,
        patch: {
          acquisition: 'lab_received',
          value: finalValue,
          sample: updatedSample,
        },
      });
      toast.success('Bordereau enregistré.');
      setEntries((prev) => {
        const next = { ...prev };
        delete next[indicatorId];
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height={64} />
        <Skeleton height={240} />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className={styles.page}>
        <p>Collecte introuvable.</p>
        <Button variant="ghost" iconLeft={<ArrowLeft size={16} />} onClick={() => navigate('/collecte')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={`Collecte ${collection.id.slice(0, 8)}`}
        title="Résultats laboratoire"
        actions={
          <Button
            variant="ghost"
            iconLeft={<ArrowLeft size={16} />}
            onClick={() => navigate(`/collecte/${collection.id}`)}
          >
            Détail collecte
          </Button>
        }
      />

      {pending.length === 0 ? (
        <div className={styles.empty}>
          <Beaker size={32} aria-hidden="true" />
          <p>Tous les bordereaux ont déjà été reçus pour cette collecte.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {pending.map((m) => {
            const rule = findRule(m.indicatorId);
            const entry: LocalEntry = entries[m.indicatorId] ?? {
              value: '',
              receivedAt: todayIso(),
              bordereauUrl: '',
            };
            return (
              <article key={m.indicatorId} className={styles.card}>
                <header className={styles.cardHead}>
                  <div>
                    <h2 className={styles.cardTitle}>{rule?.label ?? m.indicatorId}</h2>
                    <p className={styles.cardMeta}>
                      {rule?.unit ? `Unité ${rule.unit} · ` : ''}
                      Source : {rule?.source ?? '—'}
                    </p>
                  </div>
                </header>

                <div className={styles.sampleInfo}>
                  <div className={styles.sampleField}>
                    <span className={styles.sampleLabel}>ID échantillon</span>
                    <span className={styles.sampleValue}>{m.sample?.sampleId ?? '—'}</span>
                  </div>
                  <div className={styles.sampleField}>
                    <span className={styles.sampleLabel}>Laboratoire</span>
                    <span className={styles.sampleValue}>
                      {m.sample?.labId
                        ? labsById.get(m.sample.labId) ?? m.sample.labId
                        : '—'}
                    </span>
                  </div>
                  <div className={styles.sampleField}>
                    <span className={styles.sampleLabel}>Envoyé le</span>
                    <span className={styles.sampleValue}>
                      {m.sample?.sentAt ? formatDateTime(m.sample.sentAt) : '—'}
                    </span>
                  </div>
                  <div className={styles.sampleField}>
                    <span className={styles.sampleLabel}>Délai contractuel</span>
                    <span className={styles.sampleValue}>
                      {m.sample?.expectedBy ? formatDateTime(m.sample.expectedBy) : '—'}
                    </span>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <FormField
                    label="Valeur du bordereau"
                    hint={rule?.unit ? `Exprimée en ${rule.unit}` : undefined}
                    required
                  >
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="Valeur reçue"
                      value={entry.value}
                      onChange={(e) => updateEntry(m.indicatorId, { value: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Date de réception" required>
                    <Input
                      type="date"
                      value={entry.receivedAt}
                      onChange={(e) => updateEntry(m.indicatorId, { receivedAt: e.target.value })}
                    />
                  </FormField>
                  <FormField label="URL du bordereau (optionnel)">
                    <Input
                      type="url"
                      placeholder="https://…"
                      value={entry.bordereauUrl}
                      onChange={(e) =>
                        updateEntry(m.indicatorId, { bordereauUrl: e.target.value })
                      }
                    />
                  </FormField>
                </div>

                <div className={styles.cardActions}>
                  <Button
                    variant="success"
                    iconLeft={<CheckCircle2 size={16} />}
                    onClick={() => handleSave(m.indicatorId)}
                    loading={patchMeasurement.isPending}
                  >
                    Enregistrer le bordereau
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
