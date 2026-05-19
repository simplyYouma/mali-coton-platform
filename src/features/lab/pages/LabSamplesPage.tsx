import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Beaker,
  CheckCircle2,
  FileText,
  MapPin,
  PackageCheck,
  PackageX,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Badge, Button, Modal, Skeleton, Textarea } from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useCollections } from '@/features/collection/hooks/useCollections';
import { useSites } from '@/features/sites/hooks/useSites';
import { useCreateLab, useLabs } from '@/features/collection/hooks/useLabs';
import {
  useMarkSampleSent,
  useRefuseSample,
  useRejectBordereau,
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
 * Un flacon physique (containerId) — 1 prélèvement, N indicateurs analysés
 * ensemble par le même labo.
 */
interface Flacon {
  collection: Collection;
  containerId: string;
  sample: LabSample;
  measurements: Measurement[];
  daysSinceSent: number;
  isOverdue: boolean;
}

type Tab = 'to_send' | 'at_lab' | 'returned' | 'closed';

const TAB_LABEL: Record<Tab, string> = {
  to_send: 'À envoyer',
  at_lab: 'Au labo',
  returned: 'Bordereaux reçus',
  closed: 'Clôturés',
};

function classifyTab(status: LabSampleStatus): Tab {
  if (status === 'prepared') return 'to_send';
  if (status === 'sent' || status === 'received_at_lab' || status === 'in_analysis') return 'at_lab';
  if (status === 'bordereau_returned' || status === 'rejected_by_supervisor') return 'returned';
  return 'closed'; // accepted | refused_by_lab
}

export function LabSamplesPage() {
  const { user } = useAuth();
  const toast = useToast();

  const { data: awaiting, isLoading: l1 } = useCollections({ status: 'awaiting_lab' });
  const { data: complete, isLoading: l2 } = useCollections({ status: 'lab_complete' });
  const { data: sitesPage } = useSites();
  const { data: labs } = useLabs();

  const sendMut = useMarkSampleSent();
  const refuseMut = useRefuseSample();
  const transmitMut = useTransmitBordereau();
  const rejectMut = useRejectBordereau();
  const createLabMut = useCreateLab();

  const [newLabOpen, setNewLabOpen] = useState(false);
  const [newLab, setNewLab] = useState({
    name: '',
    city: '',
    contactEmail: '',
    contactPhone: '',
    slaBusinessDays: '10',
  });

  const [tab, setTab] = useState<Tab>('to_send');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refuseReason, setRefuseReason] = useState('');
  const [transmitOpen, setTransmitOpen] = useState(false);
  const [bordereauRef, setBordereauRef] = useState('');
  const [bordereauFile, setBordereauFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [sendOpen, setSendOpen] = useState(false);
  const [chosenLabId, setChosenLabId] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const sitesById = useMemo(() => {
    const map = new Map<string, string>();
    sitesPage?.items.forEach((s) => map.set(s.id, s.shortName));
    return map;
  }, [sitesPage]);

  const labsById = useMemo(() => {
    const map = new Map<string, { name: string; city: string; sla: number; contactEmail?: string }>();
    (labs ?? []).forEach((l) =>
      map.set(l.id, {
        name: l.name,
        city: l.city,
        sla: l.slaBusinessDays,
        contactEmail: l.contactEmail,
      }),
    );
    return map;
  }, [labs]);

  /** Tous les flacons issus des collectes ouvertes, groupés par containerId. */
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
        const sentAt = sample.sentAt ? new Date(sample.sentAt).getTime() : null;
        const days = sentAt ? Math.floor((now - sentAt) / 86_400_000) : 0;
        const isOverdue =
          sentAt != null &&
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

  const byTab = useMemo(() => {
    const map: Record<Tab, Flacon[]> = {
      to_send: [],
      at_lab: [],
      returned: [],
      closed: [],
    };
    for (const f of allFlacons) {
      map[classifyTab(f.sample.status)].push(f);
    }
    for (const k of Object.keys(map) as Tab[]) {
      map[k].sort((a, b) => b.daysSinceSent - a.daysSinceSent);
    }
    return map;
  }, [allFlacons]);

  const list = byTab[tab];
  const selected =
    list.find((f) => `${f.collection.id}::${f.containerId}` === selectedKey) ?? list[0] ?? null;

  const stats = {
    to_send: byTab.to_send.length,
    at_lab: byTab.at_lab.length,
    returned: byTab.returned.length,
    overdue: allFlacons.filter((f) => f.isOverdue).length,
  };

  const isLoading = l1 || l2;

  // ── Actions superviseur ──────────────────────────────────────────
  const openSend = () => {
    setChosenLabId('');
    setSendOpen(true);
  };

  const confirmSend = async () => {
    if (!selected || !user) return;
    if (!chosenLabId) {
      toast.error('Choisissez le laboratoire destinataire.');
      return;
    }
    try {
      await sendMut.mutateAsync({
        collectionId: selected.collection.id,
        containerId: selected.containerId,
        sentBy: user.id,
        labId: chosenLabId,
      });
      const labContact = labsById.get(chosenLabId)?.contactEmail ?? chosenLabId;
      toast.success(`Flacon envoyé — e-mail envoyé à ${labContact}.`);
      setSendOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const openReject = () => {
    setRejectReason('');
    setRejectOpen(true);
  };

  const confirmCreateLab = async () => {
    if (!newLab.name.trim() || !newLab.city.trim()) {
      toast.error('Nom et ville obligatoires.');
      return;
    }
    const sla = Number(newLab.slaBusinessDays);
    if (!Number.isFinite(sla) || sla <= 0) {
      toast.error('SLA invalide.');
      return;
    }
    try {
      const created = await createLabMut.mutateAsync({
        name: newLab.name.trim(),
        city: newLab.city.trim(),
        contactEmail: newLab.contactEmail.trim() || undefined,
        contactPhone: newLab.contactPhone.trim() || undefined,
        slaBusinessDays: sla,
      });
      toast.success('Laboratoire ajouté.');
      setChosenLabId(created.id);
      setNewLabOpen(false);
      setNewLab({ name: '', city: '', contactEmail: '', contactPhone: '', slaBusinessDays: '10' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const confirmReject = async () => {
    if (!selected || !user) return;
    if (!rejectReason.trim()) {
      toast.error('Précisez ce qui motive la ré-analyse.');
      return;
    }
    try {
      await rejectMut.mutateAsync({
        collectionId: selected.collection.id,
        containerId: selected.containerId,
        rejectedBy: user.id,
        reason: rejectReason.trim(),
      });
      const labContact = labsById.get(selected.sample.labId)?.contactEmail ?? selected.sample.labId;
      toast.warning(`Demande de ré-analyse envoyée à ${labContact}.`);
      setRejectOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const openRefuse = () => {
    setRefuseReason('');
    setRefuseOpen(true);
  };

  const confirmRefuse = async () => {
    if (!selected || !user) return;
    if (!refuseReason.trim()) {
      toast.error('Précisez le motif communiqué par le labo.');
      return;
    }
    try {
      await refuseMut.mutateAsync({
        collectionId: selected.collection.id,
        containerId: selected.containerId,
        reason: refuseReason.trim(),
        refusedBy: user.id,
      });
      toast.warning('Refus enregistré — l\'agent est notifié pour re-prélèvement.');
      setRefuseOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const openTransmit = (f: Flacon) => {
    setBordereauRef(f.sample.bordereauRef ?? '');
    setBordereauFile(null);
    const draft: Record<string, string> = {};
    for (const m of f.measurements) {
      draft[m.indicatorId] = m.value != null ? String(m.value) : '';
    }
    setDraftValues(draft);
    setTransmitOpen(true);
  };

  const handleFilePick = (file: File | null) => {
    if (!file) {
      setBordereauFile(null);
      return;
    }
    if (file.type !== 'application/pdf') {
      toast.error('Le bordereau doit être un PDF.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBordereauFile({ name: file.name, dataUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  const confirmTransmit = async () => {
    if (!selected || !user) return;
    const values = selected.measurements.map((m) => {
      const raw = draftValues[m.indicatorId] ?? '';
      const num = Number(raw);
      return {
        indicatorId: m.indicatorId,
        value: Number.isNaN(num) || raw === '' ? raw : num,
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
        bordereauUrl: bordereauFile?.dataUrl
          ?? (bordereauRef.trim()
            ? `https://stub.local/bordereau/${bordereauRef.trim()}.pdf`
            : undefined),
        values,
      });
      toast.success('Bordereau saisi — collecte enrichie.');
      setTransmitOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Échantillons</h1>
        </div>
        <div className={styles.heroStats}>
          <Stat label="À envoyer" value={stats.to_send} />
          <Stat label="Au labo" value={stats.at_lab} />
          <Stat label="Bordereaux reçus" value={stats.returned} />
          <Stat label="En retard SLA" value={stats.overdue} tone="danger" />
        </div>
      </header>

      <div className={styles.tabs}>
        {(['to_send', 'at_lab', 'returned', 'closed'] as Tab[]).map((t) => (
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
                (selected ? `${selected.collection.id}::${selected.containerId}` : null) === key;
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
                labInfo={labsById.get(selected.sample.labId)}
                onMarkSent={openSend}
                onRefuse={openRefuse}
                onTransmit={() => openTransmit(selected)}
                onReject={openReject}
                isSending={sendMut.isPending}
              />
            )}
          </section>
        </div>
      )}

      <Modal
        open={refuseOpen}
        onClose={() => setRefuseOpen(false)}
        title="Refus du laboratoire"
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
              Enregistrer le refus
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
        title={selected ? `Bordereau ${selected.sample.sampleId}` : 'Bordereau'}
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
              Enregistrer
            </Button>
          </>
        }
      >
        {selected ? (
          <div className={styles.transmitForm}>
            <label className={styles.transmitField}>
              <span>Référence bordereau (n° rapport du labo)</span>
              <input
                className={styles.transmitInput}
                value={bordereauRef}
                onChange={(e) => setBordereauRef(e.target.value)}
                placeholder="LNE-2026-0421"
              />
            </label>
            <label className={styles.transmitField}>
              <span>Bordereau PDF (joint envoyé par le labo)</span>
              <div className={styles.fileRow}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
                  className={styles.fileInput}
                />
                {bordereauFile ? (
                  <span className={styles.fileBadge}>
                    <FileText size={12} aria-hidden="true" /> {bordereauFile.name}
                  </span>
                ) : null}
              </div>
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

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title={selected ? `Envoyer ${selected.sample.sampleId}` : 'Envoyer le flacon'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSendOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={confirmSend}
              loading={sendMut.isPending}
              iconLeft={<Send size={14} />}
            >
              Confirmer
            </Button>
          </>
        }
      >
        <div className={styles.transmitForm}>
          {(labs ?? [])
            .filter((l) => l.isActive)
            .map((l) => (
              <label
                key={l.id}
                className={`${styles.labChoice} ${chosenLabId === l.id ? styles.labChoiceActive : ''}`}
              >
                <input
                  type="radio"
                  name="labChoice"
                  checked={chosenLabId === l.id}
                  onChange={() => setChosenLabId(l.id)}
                />
                <div className={styles.labChoiceMain}>
                  <span className={styles.labChoiceName}>
                    {l.name}
                    {l.isReference ? (
                      <Badge size="sm" variant="info">Référence</Badge>
                    ) : null}
                  </span>
                  <span className={styles.labChoiceMeta}>
                    {l.city} · SLA {l.slaBusinessDays} j · {l.contactEmail ?? '—'}
                  </span>
                </div>
              </label>
            ))}
          <button
            type="button"
            className={styles.addLabLink}
            onClick={() => setNewLabOpen(true)}
          >
            + Ajouter un laboratoire
          </button>
        </div>
      </Modal>

      <Modal
        open={newLabOpen}
        onClose={() => setNewLabOpen(false)}
        title="Nouveau laboratoire"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewLabOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={confirmCreateLab}
              loading={createLabMut.isPending}
            >
              Créer
            </Button>
          </>
        }
      >
        <div className={styles.transmitForm}>
          <label className={styles.transmitField}>
            <span>Nom</span>
            <input
              className={styles.transmitInput}
              value={newLab.name}
              onChange={(e) => setNewLab((s) => ({ ...s, name: e.target.value }))}
              placeholder="LMA — Laboratoire Mobile d'Analyse"
            />
          </label>
          <label className={styles.transmitField}>
            <span>Ville</span>
            <input
              className={styles.transmitInput}
              value={newLab.city}
              onChange={(e) => setNewLab((s) => ({ ...s, city: e.target.value }))}
              placeholder="Bamako"
            />
          </label>
          <label className={styles.transmitField}>
            <span>E-mail de contact</span>
            <input
              type="email"
              className={styles.transmitInput}
              value={newLab.contactEmail}
              onChange={(e) => setNewLab((s) => ({ ...s, contactEmail: e.target.value }))}
              placeholder="contact@labo.ml"
            />
          </label>
          <label className={styles.transmitField}>
            <span>Téléphone</span>
            <input
              className={styles.transmitInput}
              value={newLab.contactPhone}
              onChange={(e) => setNewLab((s) => ({ ...s, contactPhone: e.target.value }))}
              placeholder="+223 20 22 00 00"
            />
          </label>
          <label className={styles.transmitField}>
            <span>SLA (jours ouvrés)</span>
            <input
              type="number"
              min="1"
              className={styles.transmitInput}
              value={newLab.slaBusinessDays}
              onChange={(e) => setNewLab((s) => ({ ...s, slaBusinessDays: e.target.value }))}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Renvoyer pour ré-analyse"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={confirmReject}
              loading={rejectMut.isPending}
              iconLeft={<RefreshCw size={14} />}
            >
              Envoyer la demande
            </Button>
          </>
        }
      >
        <Textarea
          rows={4}
          placeholder="Ex : valeur sulfates aberrante (4× le pic historique du site), demande de ré-analyse en duplicate."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}

interface FlaconDetailProps {
  flacon: Flacon;
  siteName: string;
  labInfo: { name: string; sla: number; contactEmail?: string } | undefined;
  onMarkSent: () => void;
  onRefuse: () => void;
  onTransmit: () => void;
  onReject: () => void;
  isSending: boolean;
}

function FlaconDetail({
  flacon,
  siteName,
  labInfo,
  onMarkSent,
  onRefuse,
  onTransmit,
  onReject,
  isSending,
}: FlaconDetailProps) {
  const { sample, measurements, daysSinceSent, isOverdue } = flacon;
  const sla = labInfo?.sla ?? 10;
  const remaining = sla - daysSinceSent;
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
            ) : sample.status === 'sent' ? (
              <span className={styles.detailRemain}>
                {remaining > 0 ? `${remaining} j restants` : 'À rendre'} · SLA {sla} j
              </span>
            ) : null}
          </span>
          <h2 className={styles.detailTitle}>Flacon {sample.sampleId}</h2>
          <div className={styles.detailMeta}>
            <span>
              <MapPin size={12} aria-hidden="true" /> {siteName}
            </span>
            <span>{labInfo?.name ?? sample.labId}</span>
            {sample.sentAt ? <span>envoyé {formatRelativeTime(sample.sentAt)}</span> : null}
          </div>
        </div>
        <Link to={`/collecte/${flacon.collection.id}`}>
          <Button variant="ghost" size="sm">
            Voir la collecte
          </Button>
        </Link>
      </header>

      <dl className={styles.detailStrip}>
        {sample.sentAt ? (
          <span>
            <dt>Envoyé</dt>
            <dd>{formatRelativeTime(sample.sentAt)}</dd>
          </span>
        ) : null}
        {sample.expectedBy ? (
          <span>
            <dt>Délai</dt>
            <dd>{formatDateTime(sample.expectedBy, 'dd MMM')}</dd>
          </span>
        ) : null}
        {sample.analyzedAt ? (
          <span>
            <dt>Bordereau</dt>
            <dd>{formatDateTime(sample.analyzedAt, 'dd MMM')}</dd>
          </span>
        ) : null}
        {sample.bordereauRef ? (
          <span>
            <dt>Réf.</dt>
            <dd>
              <code className={styles.refCode}>{sample.bordereauRef}</code>
            </dd>
          </span>
        ) : null}
      </dl>

      <section className={styles.indicators}>
        <ul className={styles.indicatorsList}>
            {measurements.map((m) => {
              const rule = findRule(m.indicatorId);
              const hasValue = m.value != null;
              const hasRange = rule?.minOk != null || rule?.maxOk != null;
              const rangeText = hasRange
                ? (rule?.minOk != null && rule?.maxOk != null
                    ? `${rule.minOk}–${rule.maxOk}`
                    : rule?.maxOk != null
                      ? `≤ ${rule.maxOk}`
                      : `≥ ${rule?.minOk ?? ''}`)
                : null;
              return (
                <li key={m.indicatorId} className={styles.indicatorItem}>
                  <div className={styles.indicatorMain}>
                    <span className={styles.indicatorLabel}>{rule?.label ?? m.indicatorId}</span>
                    {rule?.method ? (
                      <span className={styles.indicatorRef}>{rule.method}</span>
                    ) : null}
                    {hasValue && rangeText ? (
                      <span className={styles.indicatorRef}>
                        seuil {rangeText}
                        {rule?.unit ? ` ${rule.unit}` : ''}
                      </span>
                    ) : null}
                  </div>
                  <span className={styles.indicatorValue}>
                    {hasValue ? (
                      <>
                        <strong>{String(m.value)}</strong>
                        {rule?.unit ? <span className={styles.indicatorUnit}>{rule.unit}</span> : null}
                      </>
                    ) : (
                      <span className={styles.empty2}>en attente</span>
                    )}
                  </span>
                </li>
              );
            })}
        </ul>
      </section>

      {sample.refusalReason ? (
        <div className={styles.warningBlock} data-tone="refusal">
          <strong>Refusé par le labo :</strong> {sample.refusalReason}
        </div>
      ) : null}

      {sample.rejectionReason ? (
        <div className={styles.warningBlock} data-tone="rejection">
          <strong>Ré-analyse demandée :</strong> {sample.rejectionReason}
          {sample.rejectedAt ? (
            <span className={styles.muted}> · {formatDateTime(sample.rejectedAt)}</span>
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
          Bordereau du labo ({sample.bordereauRef ?? 'PDF'})
        </a>
      ) : null}

      <div className={styles.actions}>
        {sample.status === 'prepared' ? (
          <Button
            variant="primary"
            iconLeft={<Send size={14} />}
            onClick={onMarkSent}
            loading={isSending}
          >
            Marquer envoyé au labo
          </Button>
        ) : null}
        {sample.status === 'sent' ||
        sample.status === 'received_at_lab' ||
        sample.status === 'in_analysis' ? (
          <>
            <Button
              variant="primary"
              iconLeft={<PackageCheck size={14} />}
              onClick={onTransmit}
            >
              Saisir le bordereau
            </Button>
            <Button variant="danger" iconLeft={<PackageX size={14} />} onClick={onRefuse}>
              Le labo a refusé
            </Button>
          </>
        ) : null}
        {sample.status === 'bordereau_returned' ? (
          <Button variant="danger" iconLeft={<RefreshCw size={14} />} onClick={onReject}>
            Renvoyer pour ré-analyse
          </Button>
        ) : null}
        {sample.status === 'rejected_by_supervisor' ? (
          <Button variant="primary" iconLeft={<RefreshCw size={14} />} onClick={onTransmit}>
            Re-saisir après ré-analyse
          </Button>
        ) : null}
      </div>
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
