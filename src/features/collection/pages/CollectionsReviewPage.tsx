import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Beaker,
  Calendar,
  Check,
  ClipboardCheck,
  ExternalLink,
  Inbox,
  MapPin,
  User,
  X,
} from 'lucide-react';
import { Badge, Button, Modal, Skeleton } from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useSites } from '@/features/sites/hooks/useSites';
import { mockUsers } from '@/mocks/fixtures/users';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { useCollections } from '../hooks/useCollections';
import {
  useRejectCollection,
  useValidateCollection,
} from '../hooks/useCollectionMutations';
import { findRule } from '../lib/indicatorRules';
import { PhotoLightbox } from '../components/PhotoLightbox';
import type { Collection } from '../api/collection.types';
import { STATUS_LABEL } from '../api/collection.types';
import styles from './CollectionsReviewPage.module.css';

export function CollectionsReviewPage() {
  const { user } = useAuth();
  const toast = useToast();
  const validateMut = useValidateCollection();
  const rejectMut = useRejectCollection();

  const submittedQ = useCollections({ status: 'submitted' });
  const labCompleteQ = useCollections({ status: 'lab_complete' });
  const { data: sitesPage } = useSites();

  const items = useMemo(() => {
    const a = submittedQ.data?.items ?? [];
    const b = labCompleteQ.data?.items ?? [];
    return [...a, ...b].sort(
      (x, y) => new Date(y.collectedAt).getTime() - new Date(x.collectedAt).getTime(),
    );
  }, [submittedQ.data, labCompleteQ.data]);

  const isLoading = submittedQ.isLoading || labCompleteQ.isLoading;

  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* Etat "lu" : on stocke les ids deja ouverts en localStorage pour les
   * marquer comme tels au reload (comportement boite mail). */
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('mali-coton.validation.read.v1');
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? new Set<string>(arr) : new Set();
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    localStorage.setItem(
      'mali-coton.validation.read.v1',
      JSON.stringify(Array.from(readIds)),
    );
  }, [readIds]);
  const markRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };
  const [rejectOpen, setRejectOpen] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [validationNotes, setValidationNotes] = useState('');

  const selected = useMemo(
    () => items.find((c) => c.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  const sitesById = useMemo(() => {
    const map = new Map<string, { shortName: string; city: string }>();
    sitesPage?.items.forEach((s) =>
      map.set(s.id, { shortName: s.shortName, city: s.location.city }),
    );
    return map;
  }, [sitesPage]);

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    mockUsers.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, []);

  const stats = useMemo(() => {
    const submitted = submittedQ.data?.items.length ?? 0;
    const labComplete = labCompleteQ.data?.items.length ?? 0;
    return { submitted, labComplete, total: submitted + labComplete };
  }, [submittedQ.data, labCompleteQ.data]);

  const confirmValidate = async () => {
    if (!selected || !user) return;
    try {
      await validateMut.mutateAsync({
        id: selected.id,
        validatedBy: user.id,
        notes: validationNotes || undefined,
      });
      toast.success('Collecte validée — transmission consolidée.');
      setValidationNotes('');
      setValidateOpen(false);
    } catch {
      toast.error('Échec de la validation. Réessayez.');
    }
  };

  const handleReject = async () => {
    if (!selected || !user || !rejectReason.trim()) return;
    try {
      await rejectMut.mutateAsync({
        id: selected.id,
        validatedBy: user.id,
        rejectionReason: rejectReason.trim(),
      });
      toast.success('Collecte rejetée — agent notifié.');
      setRejectReason('');
      setRejectOpen(false);
    } catch {
      toast.error('Échec du rejet. Réessayez.');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>File de validation</span>
          <h1 className={styles.heroTitle}>Revue des collectes</h1>
          <p className={styles.heroDescription}>
            File de revue des collectes soumises et bordereaux reçus du laboratoire.
          </p>
        </div>
        <div className={styles.heroStats}>
          {/* Soumises = action requise du sup → amber */}
          <div className={styles.heroStat} data-tone="warning">
            <span className={styles.heroStatValue}>{stats.submitted}</span>
            <span className={styles.heroStatLabel}>Soumises</span>
          </div>
          {/* Bordereaux recus = etape labo, donnee neutre informationelle */}
          <div className={styles.heroStat} data-tone="info">
            <span className={styles.heroStatValue}>{stats.labComplete}</span>
            <span className={styles.heroStatLabel}>Bordereaux reçus</span>
          </div>
          {/* Total = agrégat neutre */}
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>{stats.total}</span>
            <span className={styles.heroStatLabel}>Total à valider</span>
          </div>
        </div>
      </header>

      <div className={styles.split}>
        <aside className={styles.listPanel} aria-label="Collectes en attente de validation">
          <header className={styles.listHeader}>
            <span className={styles.listTitle}>En attente</span>
            {(() => {
              const unread = items.filter((c) => !readIds.has(c.id)).length;
              return unread > 0 ? (
                <span className={styles.listUnreadBadge} aria-label={`${unread} non lu`}>
                  {unread} nouveau{unread > 1 ? 'x' : ''}
                </span>
              ) : (
                <span className={styles.listCount}>{items.length}</span>
              );
            })()}
          </header>
          <div className={styles.listScroll}>
            {isLoading ? (
              <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} height={56} radius={8} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className={styles.empty}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  Aucune collecte en attente.
                </span>
              </div>
            ) : (
              items.map((c) => {
                const site = sitesById.get(c.siteId);
                const isActive = (selected?.id ?? items[0]?.id) === c.id;
                const isLab = c.status === 'lab_complete';
                const isUnread = !readIds.has(c.id);
                const Icon = isLab ? Beaker : Inbox;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      markRead(c.id);
                    }}
                    className={`${styles.row} ${isActive ? styles.rowActive : ''} ${isUnread ? styles.rowUnread : ''}`}
                    data-tone={isLab ? 'accent' : 'primary'}
                    aria-label={isUnread ? 'Non lu' : undefined}
                  >
                    <span className={styles.rowIcon} aria-hidden="true">
                      <Icon size={14} />
                    </span>
                    <div className={styles.rowMain}>
                      <span className={styles.rowSite}>
                        {site?.shortName ?? c.siteId}
                      </span>
                      <span className={styles.rowMeta}>
                        {usersById.get(c.agentId) ?? c.agentId} · {STATUS_LABEL[c.status]}
                        {c.koboVersion > 1 ? ` · Kobo v${c.koboVersion}` : ''}
                      </span>
                    </div>
                    <span className={styles.rowDate}>
                      {formatRelativeTime(c.collectedAt)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className={styles.detail} aria-label="Détail de la collecte sélectionnée">
          {!selected ? (
            <div className={styles.empty}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                Sélectionnez une collecte à gauche pour démarrer la revue.
              </span>
            </div>
          ) : (
            <ReviewDetail
              collection={selected}
              siteName={sitesById.get(selected.siteId)?.shortName ?? selected.siteId}
              siteCity={sitesById.get(selected.siteId)?.city ?? ''}
              agentName={usersById.get(selected.agentId) ?? selected.agentId}
              validationNotes={validationNotes}
              onValidationNotesChange={setValidationNotes}
              onValidate={() => setValidateOpen(true)}
              onRejectClick={() => setRejectOpen(true)}
              isValidating={validateMut.isPending}
            />
          )}
        </section>
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Rejeter la collecte"
        description="Indiquez le motif — l'agent sera notifié et pourra corriger sa saisie."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMut.isPending}
            >
              Confirmer le rejet
            </Button>
          </>
        }
      >
        <textarea
          className={styles.notesField}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Ex. mesure de pH incohérente avec les conditions du site, photo illisible…"
          rows={4}
        />
      </Modal>

      <Modal
        open={validateOpen}
        onClose={() => setValidateOpen(false)}
        title="Confirmer la validation"
        description={
          selected
            ? `Vous êtes sur le point de valider la collecte ${selected.id.slice(-6).toUpperCase()} du site ${sitesById.get(selected.siteId)?.shortName ?? selected.siteId}. Cette action sera tracée dans le journal d'audit et notifiée à l'agent.`
            : 'Confirmer la validation de la collecte.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setValidateOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="success"
              onClick={confirmValidate}
              loading={validateMut.isPending}
              iconLeft={<Check size={14} />}
            >
              Confirmer la validation
            </Button>
          </>
        }
      >
        {validationNotes ? (
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              margin: 0,
              padding: 'var(--space-3)',
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '3px solid var(--color-primary)',
            }}
          >
            <strong style={{ color: 'var(--color-text)' }}>Note jointe :</strong>
            <br />
            {validationNotes}
          </p>
        ) : (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
            Aucune note jointe à cette validation.
          </p>
        )}
      </Modal>
    </div>
  );
}

interface ReviewDetailProps {
  collection: Collection;
  siteName: string;
  siteCity: string;
  agentName: string;
  validationNotes: string;
  onValidationNotesChange: (v: string) => void;
  onValidate: () => void;
  onRejectClick: () => void;
  isValidating: boolean;
}

function ReviewDetail({
  collection,
  siteName,
  siteCity,
  agentName,
  validationNotes,
  onValidationNotesChange,
  onValidate,
  onRejectClick,
  isValidating,
}: ReviewDetailProps) {
  const totalMeas = collection.measurements.length;
  const inSitu = collection.measurements.filter((m) => m.acquisition === 'in_situ').length;
  const labReceived = collection.measurements.filter(
    (m) => m.acquisition === 'lab_received',
  ).length;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /* Toutes les mesures collectees sont affichees, peu importe le statut
   * de la collecte — on veut voir ce que l'agent a soumis tel quel. */
  const sample = collection.measurements;

  return (
    <>
      <header className={styles.detailHeader}>
        <div className={styles.detailHeaderLeft}>
          <span className={styles.detailEyebrow}>
            {STATUS_LABEL[collection.status]} · #{collection.id.slice(-6).toUpperCase()}
          </span>
          <h2 className={styles.detailTitle}>
            {siteName} — {formatDateTime(collection.collectedAt)}
          </h2>
          <div className={styles.detailMeta}>
            <span className={styles.detailMetaItem}>
              <MapPin size={14} /> {siteCity}
            </span>
            <span className={styles.detailMetaItem}>
              <User size={14} /> {agentName}
            </span>
            <span className={styles.detailMetaItem}>
              <Calendar size={14} /> {formatRelativeTime(collection.collectedAt)}
            </span>
          </div>
        </div>
        <div className={styles.detailActions}>
          <Link to={`/collecte/${collection.id}`}>
            <Button variant="secondary" iconLeft={<ExternalLink size={14} />}>
              Détail complet
            </Button>
          </Link>
        </div>
      </header>

      <div className={styles.detailBody}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Synthèse</h3>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Mesures</span>
              <span className={styles.summaryValue}>{totalMeas}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>In situ</span>
              <span className={styles.summaryValue}>{inSitu}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Bordereaux</span>
              <span className={styles.summaryValue}>{labReceived}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Photos</span>
              <span className={styles.summaryValue}>{collection.photos.length}</span>
            </div>
          </div>
        </section>

        {collection.photos.length > 0 ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Photos jointes · {collection.photos.length}
            </h3>
            <div className={styles.photoStrip}>
              {collection.photos.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles.photoThumb}
                  onClick={() => setLightboxIndex(idx)}
                  aria-label={p.note ?? `Photo ${idx + 1}`}
                  title={p.note ?? `Photo ${idx + 1}`}
                >
                  <img src={p.url} alt={p.note ?? ''} loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Mesures collectées · {totalMeas}
          </h3>
          <div className={styles.measurementList}>
            {sample.map((m) => {
              const rule = findRule(m.indicatorId);
              return (
                <div key={m.indicatorId} className={styles.measurement}>
                  <div className={styles.measurementMain}>
                    <span className={styles.measurementLabel}>
                      {rule?.label ?? m.indicatorId}
                    </span>
                    <span className={styles.measurementSource}>
                      {rule?.source ?? '—'}
                    </span>
                  </div>
                  <span className={styles.measurementValue}>
                    {m.value === null || m.value === undefined ? '—' : String(m.value)}
                    {m.unit ? ` ${m.unit}` : rule?.unit ? ` ${rule.unit}` : ''}
                  </span>
                  {m.conformity ? (
                    <Badge
                      size="sm"
                      variant={
                        m.conformity === 'conforming'
                          ? 'success'
                          : m.conformity === 'warning'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {m.conformity === 'conforming'
                        ? 'Conforme'
                        : m.conformity === 'warning'
                          ? 'À surveiller'
                          : 'Critique'}
                    </Badge>
                  ) : (
                    <span style={{ width: 84 }} />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Note de validation (optionnelle)</h3>
          <textarea
            className={styles.notesField}
            value={validationNotes}
            onChange={(e) => onValidationNotesChange(e.target.value)}
            placeholder="Ex. mesures cohérentes avec l'historique, photos lisibles, GPS conforme…"
            rows={3}
          />
        </section>

        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            iconLeft={<X size={14} />}
            onClick={onRejectClick}
          >
            Rejeter
          </Button>
          <Button
            variant="success"
            iconLeft={<Check size={14} />}
            onClick={onValidate}
            loading={isValidating}
          >
            Valider la collecte
          </Button>
        </div>
      </div>

      <PhotoLightbox
        photos={collection.photos}
        startIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
}

// Re-export for AppLayout nav icon usage if needed
export const CollectionsReviewIcon = ClipboardCheck;
