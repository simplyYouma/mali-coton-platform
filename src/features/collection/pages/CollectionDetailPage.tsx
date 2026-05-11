import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Beaker,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FlaskConical,
  Hash,
  History,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  RefreshCw,
  Send,
  Smartphone,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  Modal,
  Skeleton,
  Textarea,
} from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useSites } from '@/features/sites/hooks/useSites';
import { mockUsers } from '@/mocks/fixtures/users';
import { formatDateTime, formatGps, formatRelativeTime } from '@/lib/format';
import type {
  Collection,
  CollectionNotification,
  CollectionStatus,
  IndicatorDomain,
  Measurement,
} from '../api/collection.types';
import type { Site } from '@/features/sites/api/site.types';
import { STATUS_LABEL, STATUS_VARIANT } from '../api/collection.types';
import { findRule } from '../lib/indicatorRules';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { CorrectionStepsPicker } from '../components/CorrectionStepsPicker';
import { correctionStepLabel } from '../lib/correctionSteps';
import { buildCollectionTimeline, type TimelineEvent } from '../lib/collectionTimeline';
import { useCollection } from '../hooks/useCollections';
import { useLabs } from '../hooks/useLabs';
import {
  useRejectCollection,
  useRequestCorrection,
  useValidateCollection,
} from '../hooks/useCollectionMutations';
import styles from './CollectionDetailPage.module.css';

const WEATHER_LABEL: Record<'sunny' | 'cloudy' | 'rainy' | 'windy', string> = {
  sunny: 'Ensoleillé',
  cloudy: 'Nuageux',
  rainy: 'Pluvieux',
  windy: 'Venteux',
};

const DOMAIN_LABEL: Record<IndicatorDomain, string> = {
  water: 'Eaux usées',
  soil: 'Sol',
  air: 'Air ambiant',
  waste: 'Déchets solides',
  health: 'Santé / SST',
  socio: 'Socio-économique',
};

const STATUS_BADGE_VARIANT: Record<
  CollectionStatus,
  'neutral' | 'info' | 'warning' | 'success' | 'danger'
> = STATUS_VARIANT;

function groupByDomain(measurements: Measurement[]) {
  const grouped: Record<IndicatorDomain, Array<{ rule: ReturnType<typeof findRule>; m: Measurement }>> = {
    water: [],
    soil: [],
    air: [],
    waste: [],
    health: [],
    socio: [],
  };
  for (const m of measurements) {
    const rule = findRule(m.indicatorId);
    if (!rule) continue;
    grouped[rule.domain].push({ rule, m });
  }
  return grouped;
}

function isLabPending(m: Measurement): boolean {
  return m.acquisition === 'lab_pending';
}

function isOverdue(expectedBy?: string): boolean {
  if (!expectedBy) return false;
  return new Date(expectedBy).getTime() < Date.now();
}

/** Formate une valeur de mesure en limitant les décimales (max 2). */
function formatMeasureValue(value: Measurement['value']): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2).replace(/\.?0+$/, '');
  }
  const num = Number(value);
  if (Number.isFinite(num)) {
    if (Number.isInteger(num)) return String(num);
    return num.toFixed(2).replace(/\.?0+$/, '');
  }
  return String(value);
}

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, role } = useAuth();
  const { data: collection, isLoading, error } = useCollection(id);
  const { data: sitesPage } = useSites();
  const { data: labs } = useLabs();
  const validateMut = useValidateCollection();
  const rejectMut = useRejectCollection();
  const correctionMut = useRequestCorrection();

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [validateModalOpen, setValidateModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [correctionTargetSteps, setCorrectionTargetSteps] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const site = useMemo(
    () => sitesPage?.items.find((s) => s.id === collection?.siteId),
    [sitesPage, collection?.siteId],
  );

  const agentName = useMemo(() => {
    if (!collection) return null;
    return mockUsers.find((u) => u.id === collection.agentId)?.fullName ?? collection.agentId;
  }, [collection]);

  const labsById = useMemo(() => {
    const map = new Map<string, string>();
    (labs ?? []).forEach((l) => map.set(l.id, `${l.name} — ${l.city}`));
    return map;
  }, [labs]);

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    mockUsers.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, []);

  const grouped = useMemo(
    () => (collection ? groupByDomain(collection.measurements) : null),
    [collection],
  );

  const labPendingMeasurements = useMemo(
    () => collection?.measurements.filter(isLabPending) ?? [],
    [collection],
  );

  const canValidate =
    (role === 'superviseur' || role === 'admin') &&
    collection !== undefined &&
    (collection.status === 'submitted' ||
      collection.status === 'lab_complete' ||
      collection.status === 'awaiting_lab');

  const confirmValidate = async () => {
    if (!collection || !user) return;
    try {
      await validateMut.mutateAsync({ id: collection.id, validatedBy: user.id });
      toast.success('Collecte validée — transmission définitive.');
      setValidateModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la validation.');
    }
  };

  const handleRequestCorrection = async () => {
    if (!collection || !user) return;
    if (!correctionNotes.trim()) {
      toast.error('Précisez ce qui doit être corrigé.');
      return;
    }
    try {
      await correctionMut.mutateAsync({
        id: collection.id,
        requestedBy: user.id,
        notes: correctionNotes.trim(),
        targetSteps: correctionTargetSteps.length > 0 ? correctionTargetSteps : undefined,
      });
      toast.info('Correction demandée — l\'agent peut rouvrir la collecte.');
      setCorrectionModalOpen(false);
      setCorrectionNotes('');
      setCorrectionTargetSteps([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la demande.');
    }
  };

  const handleReject = async () => {
    if (!collection || !user) return;
    if (!rejectionReason.trim()) {
      toast.error('Le motif de rejet est obligatoire.');
      return;
    }
    try {
      await rejectMut.mutateAsync({
        id: collection.id,
        validatedBy: user.id,
        rejectionReason: rejectionReason.trim(),
      });
      toast.warning('Collecte rejetée — l\'agent a été notifié.');
      setRejectModalOpen(false);
      setRejectionReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec du rejet.');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton height={64} />
        <Skeleton height={200} />
        <Skeleton height={320} />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className={styles.page}>
        <div className={styles.fatal}>Collecte introuvable ou inaccessible.</div>
        <Button variant="ghost" iconLeft={<ArrowLeft size={16} />} onClick={() => navigate('/collecte')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link to="/collecte" className={styles.back}>
        <ArrowLeft size={14} aria-hidden="true" />
        <span>Toutes les collectes</span>
      </Link>

      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>
            <Badge variant={STATUS_BADGE_VARIANT[collection.status]} size="sm">
              {STATUS_LABEL[collection.status]}
            </Badge>
            · #{collection.id.slice(-6).toUpperCase()}
            {collection.koboVersion > 1 ? (
              <>
                {' '}·{' '}
                <span className={styles.heroVersion} title="Nombre de soumissions Kobo">
                  Kobo v{collection.koboVersion}
                </span>
              </>
            ) : null}
          </span>
          <h1 className={styles.heroTitle}>
            {site ? site.shortName : 'Collecte'} —{' '}
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 'var(--weight-regular)' }}>
              {formatDateTime(collection.collectedAt, 'dd MMM yyyy · HH:mm')}
            </span>
          </h1>
          <p className={styles.heroSubtitle}>
            <span>
              <MapPin size={14} aria-hidden="true" />
              {site ? `${site.location.commune}, ${site.location.city}` : '—'}
            </span>
            <span>·</span>
            <span>par {agentName}</span>
            <span>·</span>
            <span>{formatRelativeTime(collection.collectedAt)}</span>
          </p>
        </div>
        <div className={styles.headerActions}>
          {labPendingMeasurements.length > 0 && (role === 'superviseur' || role === 'admin') ? (
            <Link to={`/collecte/${collection.id}/resultats-labo`}>
              <Button variant="secondary" iconLeft={<Beaker size={16} />}>
                Saisir résultats labo
              </Button>
            </Link>
          ) : null}
        </div>
      </header>

      {collection.status === 'validated' && (collection.validatedBy || collection.validationNotes) ? (() => {
        const supName =
          mockUsers.find((u) => u.id === collection.validatedBy)?.fullName ?? collection.validatedBy ?? '—';
        return (
          <section className={styles.validationBanner} aria-label="Validation">
            <header className={styles.validationBannerHead}>
              <span className={styles.validationBannerIcon} aria-hidden="true">
                <CheckCircle2 size={14} />
              </span>
              <div className={styles.validationBannerTitleBlock}>
                <span className={styles.validationBannerEyebrow}>Collecte validée</span>
                <h2 className={styles.validationBannerTitle}>
                  Validée par {supName}
                </h2>
                {collection.validatedAt ? (
                  <span className={styles.validationBannerMeta}>
                    {formatRelativeTime(collection.validatedAt)} ·{' '}
                    {formatDateTime(collection.validatedAt, 'dd MMM yyyy HH:mm')}
                  </span>
                ) : null}
              </div>
            </header>
            {collection.validationNotes ? (
              <p className={styles.validationBannerNotes}>
                « {collection.validationNotes} »
              </p>
            ) : (
              <p className={styles.validationBannerEmpty}>
                Validée sans note du superviseur.
              </p>
            )}
          </section>
        );
      })() : null}

      {collection.correctionRequest ? (() => {
        const cr = collection.correctionRequest!;
        const supName =
          mockUsers.find((u) => u.id === cr.requestedBy)?.fullName ?? cr.requestedBy;
        return (
          <section className={styles.correctionBanner} aria-label="Demande de correction">
            <header className={styles.correctionHead}>
              <span className={styles.correctionIcon} aria-hidden="true">
                <Pencil size={14} />
              </span>
              <div className={styles.correctionTitleBlock}>
                <span className={styles.correctionEyebrow}>Correction demandée</span>
                <h2 className={styles.correctionTitle}>
                  {supName} attend des corrections de l'agent
                </h2>
                <span className={styles.correctionMeta}>
                  Demandé {formatRelativeTime(cr.requestedAt)} ·{' '}
                  {formatDateTime(cr.requestedAt, 'dd MMM yyyy HH:mm')}
                </span>
              </div>
            </header>
            <p className={styles.correctionNotes}>{cr.notes}</p>
            {cr.targetSteps && cr.targetSteps.length > 0 ? (
              <div className={styles.correctionSteps}>
                <span className={styles.correctionStepsLabel}>Étapes ciblées</span>
                <div className={styles.correctionStepsList}>
                  {cr.targetSteps.map((s) => (
                    <span key={s} className={styles.correctionStepChip}>
                      {correctionStepLabel(s)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        );
      })() : null}

      <section className={styles.summaryGrid} aria-label="Résumé">
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Site</span>
          <span className={styles.summaryValue}>{site?.shortName ?? '—'}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Date / heure</span>
          <span className={styles.summaryValue}>{formatDateTime(collection.collectedAt)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Agent</span>
          <span className={styles.summaryValue}>{agentName}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>
            <MapPin size={12} aria-hidden="true" /> GPS
          </span>
          <span className={styles.summaryValue}>
            {collection.gps ? formatGps(collection.gps.lat, collection.gps.lng) : '—'}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Météo</span>
          <span className={styles.summaryValue}>
            {collection.context?.weather
              ? `${WEATHER_LABEL[collection.context.weather]}${
                  collection.context.ambientTempC != null
                    ? ` · ${collection.context.ambientTempC}°C`
                    : ''
                }`
              : '—'}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Cours d'eau proche</span>
          <span className={styles.summaryValue}>
            {collection.context?.hasNearbyWatercourse ? 'Oui' : 'Non'}
          </span>
        </div>
      </section>

      <CollectionTimelineSection collection={collection} usersById={usersById} />

      <CollectionIdentityAndContact
        collection={collection}
        agent={mockUsers.find((u) => u.id === collection.agentId) ?? null}
        site={site}
      />

      {collection.notifications && collection.notifications.length > 0 ? (
        <CollectionNotificationsLog notifications={collection.notifications} />
      ) : null}

      {collection.revisions && collection.revisions.length > 0 ? (
        <CollectionRevisionsHistory
          collection={collection}
          usersById={usersById}
        />
      ) : null}

      {grouped ? (
        <section className={styles.section} aria-label="Mesures par domaine">
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Mesures collectées</h2>
              <p className={styles.sectionSubtitle}>
                Sources normatives affichées par mesure (OMS, normes maliennes).
              </p>
            </div>
          </div>

          <div className={styles.sectionBody}>
            {(Object.keys(grouped) as IndicatorDomain[])
              .filter((d) => grouped[d].length > 0)
              .map((domain) => (
                <div key={domain} className={styles.domainBlock}>
                  <h3 className={styles.domainTitle}>{DOMAIN_LABEL[domain]}</h3>
                  {grouped[domain].map(({ rule, m }) => (
                    <div key={m.indicatorId} className={styles.measureRow}>
                      <div className={styles.measureMain}>
                        <span className={styles.measureLabel}>
                          {rule?.label ?? m.indicatorId}
                        </span>
                        <span className={styles.measureSource}>
                          {m.thresholdSource ?? rule?.source ?? '—'}
                        </span>
                      </div>
                      {m.acquisition === 'lab_pending' ? (
                        <span className={styles.measurePending}>
                          <Clock size={12} /> Bordereau attendu
                        </span>
                      ) : (
                        <span className={styles.measureValue}>
                          {formatMeasureValue(m.value)}
                          {rule?.unit ? ` ${rule.unit}` : ''}
                        </span>
                      )}
                      {m.acquisition === 'lab_received' ? (
                        <Badge variant="success" size="sm">
                          Bordereau reçu
                        </Badge>
                      ) : m.acquisition === 'lab_pending' ? (
                        <Badge variant="warning" size="sm">
                          Labo en attente
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          In situ
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {labPendingMeasurements.length > 0 ? (
        <section className={styles.section} aria-label="Bordereaux laboratoire">
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>
                Bordereaux laboratoire — {labPendingMeasurements.length} en attente
              </h2>
              <p className={styles.sectionSubtitle}>
                Délai contractuel défini avec chaque laboratoire agréé. Les retards sont signalés en rouge.
              </p>
            </div>
          </div>
          <table className={styles.labTable}>
            <thead>
              <tr>
                <th>Indicateur</th>
                <th>ID échantillon</th>
                <th>Laboratoire</th>
                <th>Envoyé le</th>
                <th>Délai attendu</th>
              </tr>
            </thead>
            <tbody>
              {labPendingMeasurements.map((m) => {
                const rule = findRule(m.indicatorId);
                const overdue = isOverdue(m.sample?.expectedBy);
                return (
                  <tr key={m.indicatorId}>
                    <td>{rule?.label ?? m.indicatorId}</td>
                    <td><code>{m.sample?.sampleId ?? '—'}</code></td>
                    <td>{m.sample?.labId ? labsById.get(m.sample.labId) ?? m.sample.labId : '—'}</td>
                    <td>{m.sample?.sentAt ? formatDateTime(m.sample.sentAt) : '—'}</td>
                    <td className={overdue ? styles.labOverdue : undefined}>
                      {m.sample?.expectedBy ? formatDateTime(m.sample.expectedBy) : '—'}
                      {overdue ? ' · en retard' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {collection.photos.length > 0 ? (
        <section className={styles.section} aria-label="Photos">
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>
                Photographies horodatées · {collection.photos.length}
              </h2>
              <p className={styles.sectionSubtitle}>
                Chaque cliché conserve sa date EXIF — preuve d'horodatage pour l'audit.
              </p>
            </div>
          </div>
          <div className={styles.photosGrid}>
            {collection.photos.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                className={styles.photoTile}
                onClick={() => setLightboxIndex(idx)}
                aria-label={p.note ?? `Photo ${p.id}`}
              >
                <img src={p.url} alt={p.note ?? `Photo ${p.id}`} loading="lazy" />
                <span className={styles.photoCaption}>
                  {p.note ?? 'Sans légende'}
                  <span className={styles.photoCaptionTime}>
                    {formatDateTime(p.takenAt, 'dd MMM · HH:mm')}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {canValidate ? (
        <section className={styles.section}>
          <div className={styles.validationBlock}>
            <div>
              <h2 className={styles.sectionTitle}>Action superviseur</h2>
              <p className={styles.sectionSubtitle}>
                Validez la collecte pour transmission définitive en base centrale, ou rejetez-la
                avec motif si les données sont incohérentes.
              </p>
            </div>
            <div className={styles.validationActions}>
              <Button
                variant="primary"
                iconLeft={<CheckCircle2 size={16} />}
                onClick={() => setValidateModalOpen(true)}
                loading={validateMut.isPending}
                disabled={collection.status === 'awaiting_lab'}
              >
                Valider la collecte
              </Button>
              <Button
                variant="secondary"
                iconLeft={<Pencil size={16} />}
                onClick={() => setCorrectionModalOpen(true)}
              >
                Demander correction
              </Button>
              <Button
                variant="danger"
                iconLeft={<XCircle size={16} />}
                onClick={() => setRejectModalOpen(true)}
              >
                Rejeter avec motif
              </Button>
            </div>
            {collection.status === 'awaiting_lab' ? (
              <p className={styles.sectionSubtitle}>
                <ClipboardCheck size={12} aria-hidden="true" /> Validation possible une fois
                tous les bordereaux labo reçus.
              </p>
            ) : null}
          </div>
        </section>
      ) : collection.status === 'rejected' ? (
        <EmptyState
          title="Collecte rejetée"
          description={collection.rejectionReason ?? 'Motif non précisé.'}
        />
      ) : null}

      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Rejeter la collecte"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Le motif est consigné dans le journal d'audit et notifié à l'agent.
          </p>
          <Textarea
            rows={4}
            placeholder="Ex : valeurs incohérentes en eaux usées, ID échantillon manquant…"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleReject} loading={rejectMut.isPending}>
              Confirmer le rejet
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={validateModalOpen}
        onClose={() => setValidateModalOpen(false)}
        title="Confirmer la validation"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
            Vous êtes sur le point de valider la collecte{' '}
            <strong>#{collection.id.slice(-6).toUpperCase()}</strong> du site{' '}
            <strong>{site?.shortName ?? '—'}</strong>.
          </p>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Cette action consolide définitivement les mesures et sera tracée dans le journal d'audit.
            L'agent sera notifié de la validation.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setValidateModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={confirmValidate}
              loading={validateMut.isPending}
              iconLeft={<CheckCircle2 size={16} />}
            >
              Confirmer la validation
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={correctionModalOpen}
        onClose={() => setCorrectionModalOpen(false)}
        title="Demander une correction à l'agent"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            La collecte repasse en statut <strong>« À corriger »</strong>. L'agent recevra une
            notification et pourra rouvrir le wizard pour amender les points listés.
          </p>
          <Textarea
            rows={5}
            placeholder="Ex : pH = 12,4 implausible, joindre une photo de la lecture du pH-mètre. Vue d'ensemble de l'atelier manquante."
            value={correctionNotes}
            onChange={(e) => setCorrectionNotes(e.target.value)}
          />
          <CorrectionStepsPicker
            value={correctionTargetSteps}
            onChange={setCorrectionTargetSteps}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setCorrectionModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleRequestCorrection}
              loading={correctionMut.isPending}
              iconLeft={<Pencil size={16} />}
            >
              Envoyer la demande
            </Button>
          </div>
        </div>
      </Modal>

      <PhotoLightbox
        photos={collection.photos}
        startIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}

const TONE_ICON: Record<TimelineEvent['tone'], ReactNode> = {
  kobo: <Smartphone size={12} aria-hidden="true" />,
  kobo_resubmit: <RefreshCw size={12} aria-hidden="true" />,
  sample: <Send size={12} aria-hidden="true" />,
  lab: <FlaskConical size={12} aria-hidden="true" />,
  sup_validate: <CheckCircle2 size={12} aria-hidden="true" />,
  sup_reject: <XCircle size={12} aria-hidden="true" />,
  sup_correction: <Pencil size={12} aria-hidden="true" />,
  notification: <Bell size={12} aria-hidden="true" />,
};

interface CollectionTimelineSectionProps {
  collection: Collection;
  usersById: Map<string, string>;
}

function CollectionTimelineSection({ collection, usersById }: CollectionTimelineSectionProps) {
  const events = useMemo(() => buildCollectionTimeline(collection), [collection]);
  if (events.length === 0) return null;

  return (
    <section className={styles.section} aria-label="Chronologie">
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>
            <History size={14} aria-hidden="true" /> Chronologie de la collecte
          </h2>
          <p className={styles.sectionSubtitle}>
            Reconstituée à partir des dates de soumission, d'envoi labo, de
            validation et de correction. L'agent n'accède pas à la plateforme :
            chaque demande de correction lui est notifiée par e-mail / SMS, il
            re-soumet via Kobo, et la collecte est ré-ingérée avec le même
            identifiant.
          </p>
        </div>
      </div>
      <ol className={styles.timelineList}>
        {events.map((ev) => (
          <li key={ev.id} className={styles.timelineItem} data-tone={ev.tone}>
            <span className={styles.timelineDot} aria-hidden="true">
              {TONE_ICON[ev.tone]}
            </span>
            <div className={styles.timelineContent}>
              <span className={styles.timelineEventLabel}>{ev.label}</span>
              <span className={styles.timelineMeta}>
                {formatDateTime(ev.when, 'dd MMM yyyy · HH:mm')}
                {ev.who ? ` · ${usersById.get(ev.who) ?? ev.who}` : ''}
              </span>
              {ev.notes ? (
                <p className={styles.timelineNotes}>« {ev.notes} »</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface IdentityProps {
  collection: Collection;
  agent: { fullName: string; email: string; phone?: string; koboUsername?: string } | null;
  site: Site | undefined;
}

function CollectionIdentityAndContact({ collection, agent, site }: IdentityProps) {
  return (
    <section className={styles.section} aria-label="Identité et contact agent">
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>
            <Hash size={14} aria-hidden="true" /> Identité Kobo & contact agent
          </h2>
          <p className={styles.sectionSubtitle}>
            L'UUID Kobo est l'identifiant stable de la collecte : il reste
            identique entre la première soumission et toutes les versions
            corrigées. Le superviseur contacte l'agent via les coordonnées
            saisies au référentiel.
          </p>
        </div>
      </div>
      <div className={styles.identityGrid}>
        <div className={styles.identityCard}>
          <span className={styles.identityCardEyebrow}>Identité technique</span>
          <dl className={styles.identityList}>
            <div className={styles.identityRow}>
              <dt>UUID Kobo</dt>
              <dd>
                <code className={styles.identityCode}>{collection.koboSubmissionUuid}</code>
              </dd>
            </div>
            <div className={styles.identityRow}>
              <dt>Version Kobo</dt>
              <dd>
                v{collection.koboVersion}
                {collection.koboVersion > 1 ? (
                  <span className={styles.identityHint}>
                    {' '}· ré-soumission après correction
                  </span>
                ) : (
                  <span className={styles.identityHint}> · première soumission</span>
                )}
              </dd>
            </div>
            <div className={styles.identityRow}>
              <dt>ID interne</dt>
              <dd>
                <code className={styles.identityCode}>{collection.id}</code>
              </dd>
            </div>
            {site ? (
              <div className={styles.identityRow}>
                <dt>Site</dt>
                <dd>
                  {site.shortName} · {site.location.commune}, {site.location.city}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className={styles.identityCard}>
          <span className={styles.identityCardEyebrow}>Agent de terrain</span>
          {agent ? (
            <dl className={styles.identityList}>
              <div className={styles.identityRow}>
                <dt>
                  <UserIcon size={12} aria-hidden="true" /> Nom
                </dt>
                <dd>{agent.fullName}</dd>
              </div>
              <div className={styles.identityRow}>
                <dt>
                  <Mail size={12} aria-hidden="true" /> E-mail
                </dt>
                <dd>
                  <a href={`mailto:${agent.email}`} className={styles.identityLink}>
                    {agent.email}
                  </a>
                </dd>
              </div>
              {agent.phone ? (
                <div className={styles.identityRow}>
                  <dt>
                    <Phone size={12} aria-hidden="true" /> Mobile
                  </dt>
                  <dd>
                    <a href={`tel:${agent.phone}`} className={styles.identityLink}>
                      {agent.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {agent.koboUsername ? (
                <div className={styles.identityRow}>
                  <dt>
                    <Smartphone size={12} aria-hidden="true" /> Compte Kobo
                  </dt>
                  <dd>
                    <code className={styles.identityCode}>@{agent.koboUsername}</code>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className={styles.identityHint}>Agent introuvable au référentiel.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function CollectionNotificationsLog({ notifications }: { notifications: CollectionNotification[] }) {
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
  return (
    <section className={styles.section} aria-label="Notifications envoyées">
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>
            <Bell size={14} aria-hidden="true" /> Notifications envoyées à l'agent
          </h2>
          <p className={styles.sectionSubtitle}>
            L'agent ne consulte pas la plateforme : chaque décision du
            superviseur lui parvient par e-mail et SMS, avec un identifiant
            de message conservé pour audit.
          </p>
        </div>
      </div>
      <ul className={styles.notifList}>
        {sorted.map((n) => (
          <li key={n.id} className={styles.notifItem} data-kind={n.kind}>
            <span className={styles.notifChannel} aria-hidden="true">
              {n.channel === 'email' ? <Mail size={14} /> : <MessageSquare size={14} />}
            </span>
            <div className={styles.notifMain}>
              <span className={styles.notifLabel}>
                {n.kind === 'correction_requested'
                  ? 'Demande de correction'
                  : n.kind === 'rejected'
                    ? 'Notification de rejet'
                    : 'Notification de validation'}{' '}
                · {n.channel === 'email' ? 'E-mail' : 'SMS'}
              </span>
              <span className={styles.notifMeta}>
                Destinataire : <code>{n.recipient}</code>
                {n.ref ? (
                  <>
                    {' '}· réf. <code>{n.ref}</code>
                  </>
                ) : null}
              </span>
            </div>
            <span className={styles.notifDate}>
              {formatDateTime(n.sentAt, 'dd MMM · HH:mm')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface RevisionsHistoryProps {
  collection: Collection;
  usersById: Map<string, string>;
}

function CollectionRevisionsHistory({ collection, usersById }: RevisionsHistoryProps) {
  const revisions = collection.revisions ?? [];
  return (
    <section className={styles.section} aria-label="Historique des versions Kobo">
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>
            <RefreshCw size={14} aria-hidden="true" /> Historique des versions Kobo
          </h2>
          <p className={styles.sectionSubtitle}>
            UUID partagé{' '}
            <code className={styles.identityCode}>
              {collection.koboSubmissionUuid}
            </code>{' '}
            — chaque ligne est une soumission successive de la même collecte
            depuis Kobo.
          </p>
        </div>
      </div>
      <table className={styles.revisionsTable}>
        <thead>
          <tr>
            <th>Version</th>
            <th>Soumise le</th>
            <th>Mesures</th>
            <th>Photos</th>
            <th>Raison</th>
          </tr>
        </thead>
        <tbody>
          {revisions.map((r) => (
            <tr key={`rev-${r.version}`}>
              <td>v{r.version}</td>
              <td>{formatDateTime(r.submittedAt, 'dd MMM yyyy · HH:mm')}</td>
              <td>{r.measurementsCount}</td>
              <td>{r.photosCount}</td>
              <td>
                {r.reason === 'correction_requested'
                  ? `Correction demandée${r.triggeredBy ? ` par ${usersById.get(r.triggeredBy) ?? r.triggeredBy}` : ''}`
                  : r.reason === 'rejected_resubmit'
                    ? 'Ré-soumission après rejet'
                    : '—'}
              </td>
            </tr>
          ))}
          <tr className={styles.revisionsCurrent}>
            <td>
              <strong>v{collection.koboVersion}</strong>
            </td>
            <td>
              {collection.syncedAt
                ? formatDateTime(collection.syncedAt, 'dd MMM yyyy · HH:mm')
                : '—'}
            </td>
            <td>{collection.measurements.length}</td>
            <td>{collection.photos.length}</td>
            <td>
              <Badge size="sm" variant="info">
                Version actuelle
              </Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
