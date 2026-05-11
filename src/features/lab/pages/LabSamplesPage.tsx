import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Beaker,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  PackageCheck,
  PackageX,
  RefreshCw,
} from 'lucide-react';
import { Badge, Button, Modal, Skeleton, Textarea } from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useSites } from '@/features/sites/hooks/useSites';
import { useLabs } from '@/features/collection/hooks/useLabs';
import {
  useMarkSampleReceived,
  useRefuseSample,
  useTransmitBordereau,
} from '@/features/collection/hooks/useCollectionMutations';
import { findRule } from '@/features/collection/lib/indicatorRules';
import type {
  Collection,
  LabSample,
  LabSampleStatus,
  Measurement,
} from '@/features/collection/api/collection.types';
import {
  LAB_SAMPLE_STATUS_LABEL,
  LAB_SAMPLE_STATUS_VARIANT,
} from '@/features/collection/api/collection.types';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import styles from './LabSamplesPage.module.css';

/**
 * Représente un flacon physique (containerId) — un envoi groupé d'1 à N
 * indicateurs au même labo. Le statut est porté par le flacon, pas par les
 * mesures individuelles.
 */
interface Flacon {
  collection: Collection;
  containerId: string;
  sample: LabSample;
  /** Mesures partageant ce flacon — typiquement 1-3 indicateurs. */
  measurements: Measurement[];
  daysSinceSent: number;
  isOverdue: boolean;
}

type Tab = 'inbound' | 'in_progress' | 'returned' | 'closed';

const TAB_LABEL: Record<Tab, string> = {
  inbound: 'À réceptionner',
  in_progress: 'En cours',
  returned: 'Rendus',
  closed: 'Clôturés',
};

function classifyTab(status: LabSampleStatus): Tab {
  if (status === 'sent') return 'inbound';
  if (status === 'received_at_lab' || status === 'in_analysis') return 'in_progress';
  if (status === 'bordereau_returned' || status === 'rejected_by_supervisor') return 'returned';
  return 'closed'; // accepted | refused_by_lab | prepared
}

export function LabSamplesPage() {
  const { user, role } = useAuth();
  const toast = useToast();

  const { data: awaiting, isLoading: l1 } = useCollections({ status: 'awaiting_lab' });
  const { data: complete, isLoading: l2 } = useCollections({ status: 'lab_complete' });
  const { data: sitesPage } = useSites();
  const { data: labs } = useLabs();

  const receiveMut = useMarkSampleReceived();
  const refuseMut = useRefuseSample();
  const transmitMut = useTransmitBordereau();

  const [tab, setTab] = useState<Tab>('inbound');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Modals
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refuseReason, setRefuseReason] = useState('');
  const [transmitOpen, setTransmitOpen] = useState(false);
  const [bordereauRef, setBordereauRef] = useState('');
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  const sitesById = useMemo(() => {
    const map = new Map<string, string>();
    sitesPage?.items.forEach((s) => map.set(s.id, s.shortName));
    return map;
  }, [sitesPage]);

  const labsById = useMemo(() => {
    const map = new Map<string, { name: string; city: string; sla: number }>();
    (labs ?? []).forEach((l) =>
      map.set(l.id, { name: l.name, city: l.city, sla: l.slaBusinessDays }),
    );
    return map;
  }, [labs]);

  /** Tous les flacons des collectes ouvertes, groupés par containerId. */
  const allFlacons = useMemo<Flacon[]>(() => {
    const out: Flacon[] = [];
    const collections = [...(awaiting?.items ?? []), ...(complete?.items ?? [])];
    const now = Date.now();
    for (const c of collections) {
      const grouped = new Map<string, Measurement[]>();
      for (const m of c.measurements) {
        if (!m.sample) continue;
        const key = m.sample.containerId;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(m);
      }
      for (const [containerId, measurements] of grouped) {
        const sample = measurements[0]!.sample!;
        const sla = labsById.get(sample.labId)?.sla ?? 10;
        const sentAt = new Date(sample.sentAt).getTime();
        const days = Math.floor((now - sentAt) / 86_400_000);
        const isOverdue =
          days > sla &&
          (sample.status === 'sent' ||
            sample.status === 'received_at_lab' ||
            sample.status === 'in_analysis');
        out.push({
          collection: c,
          containerId,
          sample,
          measurements,
          daysSinceSent: days,
          isOverdue,
        });
      }
    }
    return out;
  }, [awaiting, complete, labsById]);

  // Scope au laboratoire de l'utilisateur connecté (si role=lab et labId présent)
  const scopedFlacons = useMemo(() => {
    if (role === 'lab' && user?.labId) {
      return allFlacons.filter((f) => f.sample.labId === user.labId);
    }
    return allFlacons;
  }, [allFlacons, role, user]);

  const byTab = useMemo(() => {
    const map: Record<Tab, Flacon[]> = {
      inbound: [],
      in_progress: [],
      returned: [],
      closed: [],
    };
    for (const f of scopedFlacons) {
      map[classifyTab(f.sample.status)].push(f);
    }
    for (const k of Object.keys(map) as Tab[]) {
      map[k].sort((a, b) => b.daysSinceSent - a.daysSinceSent);
    }
    return map;
  }, [scopedFlacons]);

  const list = byTab[tab];
  const selected =
    list.find((f) => `${f.collection.id}::${f.containerId}` === selectedKey) ?? list[0] ?? null;

  const stats = {
    inbound: byTab.inbound.length,
    in_progress: byTab.in_progress.length,
    returned: byTab.returned.length,
    overdue: scopedFlacons.filter((f) => f.isOverdue).length,
  };

  const isLoading = l1 || l2;
  const canActAsLab = role === 'lab' || role === 'admin';

  // ── Actions ──────────────────────────────────────────────────────
  const handleReceive = async (f: Flacon) => {
    if (!user) return;
    try {
      await receiveMut.mutateAsync({
        collectionId: f.collection.id,
        containerId: f.containerId,
        receivedBy: user.id,
      });
      toast.success('Échantillon réceptionné — superviseur notifié.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la réception.');
    }
  };

  const openRefuse = () => {
    setRefuseReason('');
    setRefuseOpen(true);
  };

  const confirmRefuse = async () => {
    if (!selected || !user) return;
    if (!refuseReason.trim()) {
      toast.error('Précisez le motif du refus.');
      return;
    }
    try {
      await refuseMut.mutateAsync({
        collectionId: selected.collection.id,
        containerId: selected.containerId,
        reason: refuseReason.trim(),
        refusedBy: user.id,
      });
      toast.warning('Échantillon refusé — agent et superviseur notifiés.');
      setRefuseOpen(false);
      setRefuseReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec du refus.');
    }
  };

  const openTransmit = (f: Flacon) => {
    setBordereauRef('');
    const draft: Record<string, string> = {};
    for (const m of f.measurements) {
      draft[m.indicatorId] = m.value != null ? String(m.value) : '';
    }
    setDraftValues(draft);
    setTransmitOpen(true);
  };

  const confirmTransmit = async () => {
    if (!selected || !user) return;
    const values = selected.measurements.map((m) => {
      const raw = draftValues[m.indicatorId] ?? '';
      const num = Number(raw);
      return {
        indicatorId: m.indicatorId,
        value: Number.isNaN(num) ? raw : num,
      };
    });
    if (values.some((v) => v.value === '' || v.value === null)) {
      toast.error('Saisissez une valeur pour chaque indicateur du flacon.');
      return;
    }
    try {
      await transmitMut.mutateAsync({
        collectionId: selected.collection.id,
        containerId: selected.containerId,
        analyzedBy: user.id,
        bordereauRef: bordereauRef.trim() || undefined,
        bordereauUrl: bordereauRef.trim()
          ? `https://stub.local/bordereau/${bordereauRef.trim()}.pdf`
          : undefined,
        values,
      });
      toast.success('Bordereau transmis au superviseur.');
      setTransmitOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la transmission.');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Échantillons</h1>
          {role === 'lab' && user?.labId ? (
            <span className={styles.heroEyebrow}>
              {labsById.get(user.labId)?.name ?? user.labId}
            </span>
          ) : null}
        </div>
        <div className={styles.heroStats}>
          <Stat label="À réceptionner" value={stats.inbound} />
          <Stat label="En cours" value={stats.in_progress} />
          <Stat label="Rendus" value={stats.returned} />
          <Stat label="En retard SLA" value={stats.overdue} tone="danger" />
        </div>
      </header>

      <div className={styles.tabs}>
        {(['inbound', 'in_progress', 'returned', 'closed'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => {
              setTab(t);
              setSelectedKey(null);
            }}
          >
            {TAB_LABEL[t]}
            <span className={styles.tabBadge}>{byTab[t].length}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton height={420} />
      ) : list.length === 0 ? (
        <div className={styles.empty}>
          <Beaker size={28} aria-hidden="true" />
          <p>Aucun flacon dans cet onglet.</p>
        </div>
      ) : (
        <div className={styles.split}>
          <aside className={styles.list} aria-label="Flacons">
            {list.map((f) => {
              const key = `${f.collection.id}::${f.containerId}`;
              const active =
                (selected
                  ? `${selected.collection.id}::${selected.containerId}`
                  : null) === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.row} ${active ? styles.rowActive : ''}`}
                  onClick={() => setSelectedKey(key)}
                  data-overdue={f.isOverdue ? 'true' : 'false'}
                >
                  <span className={styles.rowSampleId}>{f.sample.sampleId}</span>
                  <div className={styles.rowMain}>
                    <span className={styles.rowSite}>
                      {sitesById.get(f.collection.siteId) ?? f.collection.siteId}
                    </span>
                    <span className={styles.rowIndicators}>
                      {f.measurements
                        .map((m) => findRule(m.indicatorId)?.label ?? m.indicatorId)
                        .join(' · ')}
                    </span>
                  </div>
                  <Badge size="sm" variant={LAB_SAMPLE_STATUS_VARIANT[f.sample.status]}>
                    {LAB_SAMPLE_STATUS_LABEL[f.sample.status]}
                  </Badge>
                </button>
              );
            })}
          </aside>

          <section className={styles.detail} aria-label="Détail flacon">
            {!selected ? (
              <div className={styles.empty}>Sélectionnez un flacon.</div>
            ) : (
              <FlaconDetail
                flacon={selected}
                siteName={sitesById.get(selected.collection.siteId) ?? selected.collection.siteId}
                labName={labsById.get(selected.sample.labId)?.name ?? selected.sample.labId}
                slaDays={labsById.get(selected.sample.labId)?.sla ?? 10}
                canActAsLab={canActAsLab}
                onReceive={() => handleReceive(selected)}
                onRefuse={openRefuse}
                onTransmit={() => openTransmit(selected)}
                isReceiving={receiveMut.isPending}
              />
            )}
          </section>
        </div>
      )}

      <Modal
        open={refuseOpen}
        onClose={() => setRefuseOpen(false)}
        title="Refuser l'échantillon"
        description="Le flacon ne peut pas être analysé — précisez la raison. L'agent et le superviseur seront notifiés."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefuseOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={confirmRefuse}
              loading={refuseMut.isPending}
              iconLeft={<PackageX size={14} />}
            >
              Confirmer le refus
            </Button>
          </>
        }
      >
        <Textarea
          rows={4}
          placeholder="Ex : volume insuffisant (35 mL reçus, 100 mL requis). Joint du flacon cassé en transit."
          value={refuseReason}
          onChange={(e) => setRefuseReason(e.target.value)}
        />
      </Modal>

      <Modal
        open={transmitOpen}
        onClose={() => setTransmitOpen(false)}
        title="Transmettre le bordereau"
        description={
          selected
            ? `Saisir les valeurs analysées pour le flacon ${selected.sample.sampleId} (${selected.measurements.length} indicateur${selected.measurements.length > 1 ? 's' : ''}).`
            : ''
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setTransmitOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={confirmTransmit}
              loading={transmitMut.isPending}
              iconLeft={<CheckCircle2 size={14} />}
            >
              Transmettre
            </Button>
          </>
        }
      >
        {selected ? (
          <div className={styles.transmitForm}>
            <label className={styles.transmitField}>
              <span>Référence bordereau (n° rapport)</span>
              <input
                className={styles.transmitInput}
                value={bordereauRef}
                onChange={(e) => setBordereauRef(e.target.value)}
                placeholder="LNE-2026-0421"
              />
            </label>
            {selected.measurements.map((m) => {
              const rule = findRule(m.indicatorId);
              return (
                <label key={m.indicatorId} className={styles.transmitField}>
                  <span>
                    {rule?.label ?? m.indicatorId}
                    {rule?.unit ? ` (${rule.unit})` : ''}
                  </span>
                  <input
                    type="number"
                    step="0.001"
                    inputMode="decimal"
                    className={styles.transmitInput}
                    value={draftValues[m.indicatorId] ?? ''}
                    onChange={(e) =>
                      setDraftValues((d) => ({ ...d, [m.indicatorId]: e.target.value }))
                    }
                  />
                </label>
              );
            })}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

interface FlaconDetailProps {
  flacon: Flacon;
  siteName: string;
  labName: string;
  slaDays: number;
  canActAsLab: boolean;
  onReceive: () => void;
  onRefuse: () => void;
  onTransmit: () => void;
  isReceiving: boolean;
}

function FlaconDetail({
  flacon,
  siteName,
  labName,
  slaDays,
  canActAsLab,
  onReceive,
  onRefuse,
  onTransmit,
  isReceiving,
}: FlaconDetailProps) {
  const { sample, measurements, daysSinceSent, isOverdue } = flacon;
  const remaining = slaDays - daysSinceSent;
  return (
    <>
      <header className={styles.detailHead}>
        <div>
          <span className={styles.detailEyebrow}>
            <Badge size="sm" variant={LAB_SAMPLE_STATUS_VARIANT[sample.status]}>
              {LAB_SAMPLE_STATUS_LABEL[sample.status]}
            </Badge>
            {isOverdue ? (
              <span className={styles.detailOverdue}>SLA dépassé</span>
            ) : (sample.status === 'sent' ||
                sample.status === 'received_at_lab' ||
                sample.status === 'in_analysis') ? (
              <span className={styles.detailRemain}>
                {remaining > 0 ? `${remaining} j restants` : 'À rendre'} · SLA {slaDays} j
              </span>
            ) : null}
          </span>
          <h2 className={styles.detailTitle}>Flacon {sample.sampleId}</h2>
          <div className={styles.detailMeta}>
            <span>
              <MapPin size={12} aria-hidden="true" /> {siteName}
            </span>
            <span>{labName}</span>
            <span>envoyé {formatRelativeTime(sample.sentAt)}</span>
          </div>
        </div>
        <Link to={`/collecte/${flacon.collection.id}`}>
          <Button variant="ghost" size="sm">
            Voir la collecte
          </Button>
        </Link>
      </header>

      <div className={styles.detailGrid}>
        <KV label="Envoyé le" value={formatDateTime(sample.sentAt)} />
        <KV
          label="Réceptionné"
          value={sample.receivedAt ? formatDateTime(sample.receivedAt) : '—'}
        />
        <KV
          label="Analyse débutée"
          value={sample.analysisStartedAt ? formatDateTime(sample.analysisStartedAt) : '—'}
        />
        <KV
          label="Bordereau rendu"
          value={sample.analyzedAt ? formatDateTime(sample.analyzedAt) : '—'}
        />
        {sample.bordereauRef ? <KV label="Réf. bordereau" value={sample.bordereauRef} /> : null}
        <KV label="SLA contractuel" value={`${slaDays} j ouvrés`} />
      </div>

      <section className={styles.indicators}>
        <h3 className={styles.indicatorsTitle}>
          Indicateurs partageant ce flacon · {measurements.length}
        </h3>
        <table className={styles.indicatorsTable}>
          <thead>
            <tr>
              <th>Indicateur</th>
              <th>Valeur</th>
              <th>Plage OK</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {measurements.map((m) => {
              const rule = findRule(m.indicatorId);
              return (
                <tr key={m.indicatorId}>
                  <td>{rule?.label ?? m.indicatorId}</td>
                  <td>
                    {m.value != null ? (
                      <strong>
                        {String(m.value)}
                        {rule?.unit ? ` ${rule.unit}` : ''}
                      </strong>
                    ) : (
                      <span className={styles.empty2}>en attente</span>
                    )}
                  </td>
                  <td className={styles.muted}>
                    {rule?.minOk != null || rule?.maxOk != null
                      ? `${rule?.minOk ?? '—'} – ${rule?.maxOk ?? '—'}`
                      : '—'}
                  </td>
                  <td className={styles.muted}>{rule?.source ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {sample.refusalReason ? (
        <div className={styles.warningBlock} data-tone="refusal">
          <strong>Motif de refus :</strong> {sample.refusalReason}
        </div>
      ) : null}

      {sample.rejectionReason ? (
        <div className={styles.warningBlock} data-tone="rejection">
          <strong>Bordereau renvoyé par le superviseur :</strong> {sample.rejectionReason}
          {sample.rejectedAt ? (
            <span className={styles.muted}>
              {' '}
              · {formatDateTime(sample.rejectedAt)}
            </span>
          ) : null}
        </div>
      ) : null}

      {sample.bordereauUrl ? (
        <a
          className={styles.bordereauLink}
          href={sample.bordereauUrl}
          target="_blank"
          rel="noopener"
        >
          <FileText size={14} aria-hidden="true" />
          Télécharger le bordereau ({sample.bordereauRef ?? 'PDF'})
        </a>
      ) : null}

      {canActAsLab ? (
        <div className={styles.actions}>
          {sample.status === 'sent' ? (
            <>
              <Button
                variant="primary"
                iconLeft={<PackageCheck size={14} />}
                onClick={onReceive}
                loading={isReceiving}
              >
                Accuser réception
              </Button>
              <Button variant="danger" iconLeft={<PackageX size={14} />} onClick={onRefuse}>
                Refuser le flacon
              </Button>
            </>
          ) : null}
          {sample.status === 'received_at_lab' || sample.status === 'in_analysis' ? (
            <>
              <Button
                variant="primary"
                iconLeft={<CheckCircle2 size={14} />}
                onClick={onTransmit}
              >
                Saisir le bordereau
              </Button>
              <Button variant="danger" iconLeft={<PackageX size={14} />} onClick={onRefuse}>
                Refuser le flacon
              </Button>
            </>
          ) : null}
          {sample.status === 'rejected_by_supervisor' ? (
            <Button
              variant="primary"
              iconLeft={<RefreshCw size={14} />}
              onClick={onTransmit}
            >
              Soumettre une nouvelle analyse
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'danger';
}) {
  return (
    <div className={styles.stat} data-tone={tone ?? 'neutral'}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
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

interface ClockProps {
  size?: number;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _ClockMarker(_: ClockProps) {
  return <Clock size={12} />;
}
