import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Beaker,
  Bell,
  CheckCircle2,
  Clock,
  FlaskConical,
  History,
  MapPin,
  Pencil,
  RefreshCw,
  Send,
  Smartphone,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  FormField,
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
  CollectionStatus,
  IndicatorDomain,
  Measurement,
} from '../api/collection.types';
import { POINT_PRELEVEMENT_LABEL } from '../api/collection.types';
import { STATUS_LABEL, STATUS_VARIANT } from '../api/collection.types';
import { findRule } from '../lib/indicatorRules';
/* Score qualité + détection d'anomalies retirés du detail page : info bruitee dans la maquette. */
import { PhotoLightbox } from '../components/PhotoLightbox';
import { CorrectionStepsPicker } from '../components/CorrectionStepsPicker';
import { correctionStepLabel } from '../lib/correctionSteps';
import { buildCollectionTimeline, type TimelineEvent } from '../lib/collectionTimeline';
import { useCollection } from '../hooks/useCollections';
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
  /**
   * État local des validations par mesure — overlay sur Measurement.validation
   * pour ne pas avoir à muter la fixture. Phase B3 : le backend exposera ces
   * actions via ValidationSuperviseur dédié.
   */
  const [localValidations, setLocalValidations] = useState<
    Record<string, { statut: 'valide' | 'rejete'; commentaire?: string; validePar?: string; dateValidation: string }>
  >({});
  const [rejectMeasureTarget, setRejectMeasureTarget] = useState<string | null>(null);
  const [rejectMeasureReason, setRejectMeasureReason] = useState('');

  const applyMeasurementValidation = (
    indicatorId: string,
    statut: 'valide' | 'rejete',
    commentaire?: string,
  ) => {
    if (!user) return;
    setLocalValidations((prev) => ({
      ...prev,
      [indicatorId]: {
        statut,
        commentaire,
        validePar: user.id,
        dateValidation: new Date().toISOString(),
      },
    }));
    if (statut === 'valide') {
      toast.success(`Mesure ${indicatorId} validée.`);
    } else {
      toast.warning(`Mesure ${indicatorId} rejetée.`);
    }
  };

  const validateMeasurement = (indicatorId: string, statut: 'valide' | 'rejete') => {
    if (!user) return;
    if (statut === 'rejete') {
      setRejectMeasureTarget(indicatorId);
      setRejectMeasureReason('');
      return;
    }
    applyMeasurementValidation(indicatorId, 'valide');
  };

  const confirmRejectMeasure = () => {
    if (!rejectMeasureTarget) return;
    applyMeasurementValidation(
      rejectMeasureTarget,
      'rejete',
      rejectMeasureReason.trim() || undefined,
    );
    setRejectMeasureTarget(null);
    setRejectMeasureReason('');
  };

  const site = useMemo(
    () => sitesPage?.items.find((s) => s.id === collection?.siteId),
    [sitesPage, collection?.siteId],
  );

  const agentName = useMemo(() => {
    if (!collection) return null;
    return mockUsers.find((u) => u.id === collection.agentId)?.fullName ?? collection.agentId;
  }, [collection]);

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
                <span className={styles.heroVersion} title="Ré-soumission après correction">
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
          <span className={styles.summaryLabel}>Point de prélèvement</span>
          <span className={styles.summaryValue}>
            {collection.prelevements && collection.prelevements.length > 0 ? (
              <>
                {POINT_PRELEVEMENT_LABEL[collection.prelevements[0]!.pointPrelevement]}
                <span className={styles.summaryHint}>
                  {' '}· {collection.prelevements[0]!.codePrelevement}
                </span>
              </>
            ) : collection.pointPrelevement ? (
              POINT_PRELEVEMENT_LABEL[collection.pointPrelevement]
            ) : (
              <span className={styles.summaryHint}>—</span>
            )}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Date / heure</span>
          <span className={styles.summaryValue}>{formatDateTime(collection.collectedAt)}</span>
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
        <div className={`${styles.summaryItem} ${styles.summaryItemCompact}`}>
          <span className={styles.summaryLabel}>Cours d'eau</span>
          <span className={styles.summaryValue}>
            {collection.context?.hasNearbyWatercourse ? 'Oui' : 'Non'}
          </span>
        </div>
        <Link
          to={`/agents/${collection.agentId}`}
          className={`${styles.summaryItem} ${styles.summaryItemAgent} ${styles.summaryItemClickable}`}
        >
          <span className={styles.summaryLabel}>Agent</span>
          <span className={styles.summaryValue}>{agentName}</span>
        </Link>
      </section>

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
                  {grouped[domain].map(({ rule, m }) => {
                    const hasValue = m.value != null && m.value !== '';
                    const validation = localValidations[m.indicatorId] ?? m.validation;
                    const canValidateRow =
                      hasValue && (role === 'superviseur' || role === 'admin');
                    return (
                      <div key={m.indicatorId} className={styles.measureRow}>
                        <div className={styles.measureMain}>
                          <span className={styles.measureLabel}>
                            {rule?.label ?? m.indicatorId}
                          </span>
                          <span className={styles.measureSource}>
                            {rule?.method ?? m.thresholdSource ?? rule?.source ?? '—'}
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
                        {validation?.statut === 'valide' ? (
                          <Badge variant="success" size="sm" title={validation.commentaire}>
                            <CheckCircle2 size={12} /> Validé
                          </Badge>
                        ) : validation?.statut === 'rejete' ? (
                          <Badge variant="danger" size="sm" title={validation.commentaire}>
                            <XCircle size={12} /> Rejeté
                          </Badge>
                        ) : m.acquisition === 'lab_received' ? (
                          <Badge variant="info" size="sm">Bordereau reçu</Badge>
                        ) : m.acquisition === 'lab_pending' ? (
                          <Badge variant="warning" size="sm">Labo en attente</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">In situ</Badge>
                        )}
                        {canValidateRow ? (
                          <span className={styles.rowValidationActions}>
                            <button
                              type="button"
                              className={styles.rowValidateBtn}
                              onClick={() => validateMeasurement(m.indicatorId, 'valide')}
                              aria-label="Valider cette mesure"
                              title="Valider"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              type="button"
                              className={styles.rowRejectBtn}
                              onClick={() => validateMeasurement(m.indicatorId, 'rejete')}
                              aria-label="Rejeter cette mesure"
                              title="Rejeter"
                            >
                              <XCircle size={14} />
                            </button>
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
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
        <div
          className={styles.supDock}
          role="region"
          aria-label="Actions superviseur"
          title={
            collection.status === 'awaiting_lab'
              ? 'Validation possible une fois tous les bordereaux reçus'
              : undefined
          }
        >
          <Button
            variant="danger"
            iconLeft={<XCircle size={16} />}
            onClick={() => setRejectModalOpen(true)}
          >
            Rejeter
          </Button>
          <Button
            variant="secondary"
            iconLeft={<Pencil size={16} />}
            onClick={() => setCorrectionModalOpen(true)}
          >
            Demander correction
          </Button>
          <Button
            variant="success"
            iconLeft={<CheckCircle2 size={16} />}
            onClick={() => setValidateModalOpen(true)}
            loading={validateMut.isPending}
            disabled={collection.status === 'awaiting_lab'}
          >
            Valider
          </Button>
        </div>
      ) : collection.status === 'rejected' ? (
        <EmptyState
          title="Collecte rejetée"
          description={collection.rejectionReason ?? 'Motif non précisé.'}
        />
      ) : null}

      <CollectionTimelineSection collection={collection} usersById={usersById} />

      {collection.revisions && collection.revisions.length > 0 ? (
        <CollectionRevisionsHistory
          collection={collection}
          usersById={usersById}
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
              variant="success"
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

      <Modal
        open={rejectMeasureTarget !== null}
        onClose={() => setRejectMeasureTarget(null)}
        title="Rejeter la mesure"
        width={520}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectMeasureTarget(null)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmRejectMeasure}>
              Confirmer le rejet
            </Button>
          </>
        }
      >
        <FormField label="Motif (optionnel)">
          <Textarea
            rows={3}
            value={rejectMeasureReason}
            onChange={(e) => setRejectMeasureReason(e.target.value)}
            placeholder="Ex. valeur incohérente avec l'historique, suspicion d'erreur d'instrumentation…"
          />
        </FormField>
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
            <History size={14} aria-hidden="true" /> Chronologie
          </h2>
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
              {ev.who ? (
                <span className={styles.timelineMeta}>
                  {usersById.get(ev.who) ?? ev.who}
                </span>
              ) : null}
            </div>
            <span className={styles.timelineDateChip}>
              {formatDateTime(ev.when, 'dd MMM · HH:mm')}
            </span>
            {ev.notes ? (
              <p className={styles.timelineNotes}>« {ev.notes} »</p>
            ) : null}
          </li>
        ))}
      </ol>
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
            <RefreshCw size={14} aria-hidden="true" /> Versions Kobo
          </h2>
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

