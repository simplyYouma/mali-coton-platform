import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Beaker, CheckCircle2, Clock, FileUp, MapPin } from 'lucide-react';
import { Badge, Button, Skeleton } from '@/components/common';
import { useToast } from '@/app/providers/ToastProvider';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useSites } from '@/features/sites/hooks/useSites';
import { usePatchMeasurement } from '@/features/collection/hooks/useCollectionMutations';
import { findRule } from '@/features/collection/lib/indicatorRules';
import type {
  Collection,
  Measurement,
} from '@/features/collection/api/collection.types';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import styles from './LabSamplesPage.module.css';

interface SampleEntry {
  collection: Collection;
  measurement: Measurement;
  sampleId: string;
  daysSinceSent: number;
  slaRemaining: number;
  isOverdue: boolean;
}

const LAB_SLA_DAYS = 10;

export function LabSamplesPage() {
  const toast = useToast();
  const { data: pendingPage, isLoading: lp1 } = useCollections({ status: 'awaiting_lab' });
  const { data: completePage, isLoading: lp2 } = useCollections({ status: 'lab_complete' });
  const { data: sitesPage } = useSites();
  const patchMut = usePatchMeasurement();

  const [tab, setTab] = useState<'pending' | 'transmitted'>('pending');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');

  const sitesById = useMemo(() => {
    const map = new Map<string, string>();
    sitesPage?.items.forEach((s) => map.set(s.id, s.shortName));
    return map;
  }, [sitesPage]);

  const pendingSamples = useMemo<SampleEntry[]>(() => {
    const out: SampleEntry[] = [];
    const now = Date.now();
    for (const c of pendingPage?.items ?? []) {
      for (const m of c.measurements) {
        if (m.acquisition !== 'lab_pending' || !m.sample) continue;
        const sentAt = new Date(m.sample.sentAt).getTime();
        const days = Math.floor((now - sentAt) / 86_400_000);
        out.push({
          collection: c,
          measurement: m,
          sampleId: m.sample.sampleId,
          daysSinceSent: days,
          slaRemaining: LAB_SLA_DAYS - days,
          isOverdue: days > LAB_SLA_DAYS,
        });
      }
    }
    out.sort((a, b) => b.daysSinceSent - a.daysSinceSent);
    return out;
  }, [pendingPage]);

  const transmittedSamples = useMemo<SampleEntry[]>(() => {
    const out: SampleEntry[] = [];
    const now = Date.now();
    for (const c of completePage?.items ?? []) {
      for (const m of c.measurements) {
        if (m.acquisition !== 'lab_received' || !m.sample) continue;
        const sentAt = new Date(m.sample.sentAt).getTime();
        const days = Math.floor((now - sentAt) / 86_400_000);
        out.push({
          collection: c,
          measurement: m,
          sampleId: m.sample.sampleId,
          daysSinceSent: days,
          slaRemaining: LAB_SLA_DAYS - days,
          isOverdue: false,
        });
      }
    }
    return out.slice(0, 30);
  }, [completePage]);

  const list = tab === 'pending' ? pendingSamples : transmittedSamples;
  const selected = list.find((s) => `${s.collection.id}::${s.measurement.indicatorId}` === selectedKey)
    ?? list[0]
    ?? null;

  const stats = useMemo(() => {
    const overdue = pendingSamples.filter((s) => s.isOverdue).length;
    return {
      pending: pendingSamples.length,
      overdue,
      transmitted: transmittedSamples.length,
    };
  }, [pendingSamples, transmittedSamples]);

  const handleTransmit = async () => {
    if (!selected) return;
    if (!draftValue.trim()) {
      toast.error('Saisir la valeur du bordereau avant de transmettre.');
      return;
    }
    const numeric = Number(draftValue);
    const finalValue = Number.isNaN(numeric) ? draftValue : numeric;
    try {
      await patchMut.mutateAsync({
        collectionId: selected.collection.id,
        indicatorId: selected.measurement.indicatorId,
        patch: {
          acquisition: 'lab_received',
          value: finalValue,
          sample: {
            ...(selected.measurement.sample ?? {
              sampleId: selected.sampleId,
              labId: 'lab.lne',
              sentAt: new Date().toISOString(),
            }),
            receivedAt: new Date().toISOString(),
          },
        },
      });
      toast.success('Bordereau transmis au superviseur.');
      setDraftValue('');
      setSelectedKey(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la transmission.');
    }
  };

  const isLoading = lp1 || lp2;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Espace laboratoire</span>
          <h1 className={styles.heroTitle}>Échantillons</h1>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.pending}</span>
            <span className={styles.statLabel}>À analyser</span>
          </div>
          <div className={styles.stat} data-tone="critical">
            <span className={styles.statValue}>{stats.overdue}</span>
            <span className={styles.statLabel}>En retard SLA</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.transmitted}</span>
            <span className={styles.statLabel}>Transmis</span>
          </div>
        </div>
      </header>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'pending' ? styles.tabActive : ''}`}
          onClick={() => {
            setTab('pending');
            setSelectedKey(null);
          }}
        >
          À analyser <span className={styles.tabBadge}>{stats.pending}</span>
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'transmitted' ? styles.tabActive : ''}`}
          onClick={() => {
            setTab('transmitted');
            setSelectedKey(null);
          }}
        >
          Transmis (30 derniers)
        </button>
      </div>

      {isLoading ? (
        <Skeleton height={420} />
      ) : list.length === 0 ? (
        <div className={styles.empty}>
          <Beaker size={28} aria-hidden="true" />
          <p>{tab === 'pending' ? 'Aucun échantillon en attente.' : 'Aucun bordereau transmis récemment.'}</p>
        </div>
      ) : (
        <div className={styles.split}>
          <aside className={styles.list} aria-label="Échantillons">
            {list.map((s) => {
              const key = `${s.collection.id}::${s.measurement.indicatorId}`;
              const rule = findRule(s.measurement.indicatorId);
              const active = (selected
                ? `${selected.collection.id}::${selected.measurement.indicatorId}`
                : null) === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.row} ${active ? styles.rowActive : ''}`}
                  onClick={() => {
                    setSelectedKey(key);
                    setDraftValue('');
                  }}
                  data-overdue={s.isOverdue ? 'true' : 'false'}
                >
                  <span className={styles.rowSampleId}>{s.sampleId || '—'}</span>
                  <div className={styles.rowMain}>
                    <span className={styles.rowIndicator}>{rule?.label ?? s.measurement.indicatorId}</span>
                    <span className={styles.rowSite}>{sitesById.get(s.collection.siteId) ?? s.collection.siteId}</span>
                  </div>
                  <span className={styles.rowAge}>
                    <Clock size={11} aria-hidden="true" /> {s.daysSinceSent} j
                  </span>
                </button>
              );
            })}
          </aside>

          <section className={styles.detail} aria-label="Détail">
            {!selected ? (
              <div className={styles.empty}>Sélectionnez un échantillon</div>
            ) : (
              <SampleDetail
                entry={selected}
                siteName={sitesById.get(selected.collection.siteId) ?? selected.collection.siteId}
                onTransmit={handleTransmit}
                draftValue={draftValue}
                onDraftChange={setDraftValue}
                isPending={patchMut.isPending}
                readOnly={tab === 'transmitted'}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

interface SampleDetailProps {
  entry: SampleEntry;
  siteName: string;
  draftValue: string;
  onDraftChange: (v: string) => void;
  onTransmit: () => void;
  isPending: boolean;
  readOnly: boolean;
}

function SampleDetail({
  entry,
  siteName,
  draftValue,
  onDraftChange,
  onTransmit,
  isPending,
  readOnly,
}: SampleDetailProps) {
  const rule = findRule(entry.measurement.indicatorId);
  return (
    <>
      <header className={styles.detailHead}>
        <div>
          <span className={styles.detailEyebrow}>
            {entry.isOverdue ? 'En retard SLA' : `${entry.slaRemaining} j restants`}
          </span>
          <h2 className={styles.detailTitle}>{rule?.label ?? entry.measurement.indicatorId}</h2>
          <div className={styles.detailMeta}>
            <span><MapPin size={12} aria-hidden="true" /> {siteName}</span>
            <span>échantillon <strong>{entry.sampleId}</strong></span>
            <span>envoyé {formatRelativeTime(entry.measurement.sample!.sentAt)}</span>
          </div>
        </div>
        <Link to={`/collecte/${entry.collection.id}`}>
          <Button variant="ghost" size="sm">
            Voir collecte
          </Button>
        </Link>
      </header>

      <div className={styles.detailGrid}>
        <KV label="Domaine" value={rule?.domain ?? '—'} />
        <KV label="Unité" value={rule?.unit ?? '—'} />
        <KV
          label="Plage de référence"
          value={
            rule?.minOk != null || rule?.maxOk != null
              ? `${rule?.minOk ?? '—'} – ${rule?.maxOk ?? '—'} ${rule?.unit ?? ''}`
              : '—'
          }
        />
        <KV label="Source normative" value={rule?.source ?? '—'} />
        <KV label="Date envoi" value={formatDateTime(entry.measurement.sample!.sentAt)} />
        <KV label="SLA contractuel" value={`${LAB_SLA_DAYS} j ouvrés`} />
      </div>

      {readOnly ? (
        <div className={styles.transmittedBlock}>
          <Badge variant="success" size="sm">
            Bordereau transmis
          </Badge>
          <span className={styles.transmittedValue}>
            Valeur transmise : <strong>{String(entry.measurement.value ?? '—')}</strong>
            {entry.measurement.unit ? ` ${entry.measurement.unit}` : ''}
          </span>
          {entry.measurement.sample?.receivedAt ? (
            <span className={styles.transmittedDate}>
              {formatRelativeTime(entry.measurement.sample.receivedAt)}
            </span>
          ) : null}
        </div>
      ) : (
        <div className={styles.formBlock}>
          <label className={styles.formLabel}>
            Valeur d'analyse
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              className={styles.formInput}
              placeholder={`Valeur en ${rule?.unit ?? 'unité'}`}
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
            />
          </label>
          <label className={styles.formLabel}>
            Bordereau certifié (PDF)
            <span className={styles.fileStub}>
              <FileUp size={14} aria-hidden="true" />
              Choisir un fichier
              <span className={styles.fileHint}>upload activé en production</span>
            </span>
          </label>
          <div className={styles.formActions}>
            <Button
              variant="primary"
              iconLeft={<CheckCircle2 size={14} />}
              onClick={onTransmit}
              loading={isPending}
            >
              Transmettre au superviseur
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{label}</span>
      <span className={styles.kvValue}>{value}</span>
    </div>
  );
}
