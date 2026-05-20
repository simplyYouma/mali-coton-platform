import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  ListChecks,
  MapPin,
  Plus,
  Search,
  Target,
  Trash2,
  User,
} from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  FormField,
  Input,
  Modal,
  Select,
  Skeleton,
  Textarea,
} from '@/components/common';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useSites } from '@/features/sites/hooks/useSites';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import {
  useCreateRecommandation,
  useDeleteRecommandation,
  useRecommandations,
  useUpdateRecommandation,
} from '../hooks/useRecommandations';
import type {
  Recommandation,
  RecommandationPriorite,
  RecommandationStatut,
} from '../api/recommandations.types';
import {
  PRIORITE_LABEL,
  PRIORITE_VARIANT,
  STATUT_LABEL,
  STATUT_VARIANT,
} from '../api/recommandations.types';
import styles from './RecommandationsPage.module.css';

type StatutFilter = 'all' | RecommandationStatut;
type PrioriteFilter = 'all' | RecommandationPriorite;

interface FormState {
  titre: string;
  description: string;
  niveauPriorite: RecommandationPriorite;
  siteId: string;
  responsableSuivi: string;
  dateEcheance: string;
}

const EMPTY_FORM: FormState = {
  titre: '',
  description: '',
  niveauPriorite: 'moyenne',
  siteId: '',
  responsableSuivi: '',
  dateEcheance: '',
};

export function RecommandationsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: page, isLoading } = useRecommandations();
  const { data: sitesPage } = useSites();
  const createMut = useCreateRecommandation();
  const updateMut = useUpdateRecommandation();
  const deleteMut = useDeleteRecommandation();

  const [query, setQuery] = useState('');
  const [statutFilter, setStatutFilter] = useState<StatutFilter>('all');
  const [prioriteFilter, setPrioriteFilter] = useState<PrioriteFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const items = useMemo(() => {
    const all = page?.items ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      if (statutFilter !== 'all' && r.statut !== statutFilter) return false;
      if (prioriteFilter !== 'all' && r.niveauPriorite !== prioriteFilter) return false;
      if (q && !r.titre.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [page, statutFilter, prioriteFilter, query]);

  const selected = items.find((r) => r.id === selectedId) ?? items[0] ?? null;

  const sitesById = useMemo(() => {
    const map = new Map<string, string>();
    (sitesPage?.items ?? []).forEach((s) => map.set(s.id, s.shortName));
    return map;
  }, [sitesPage]);

  const stats = useMemo(() => {
    const all = page?.items ?? [];
    return {
      total: all.length,
      critiques: all.filter((r) => r.niveauPriorite === 'critique').length,
      enCours: all.filter((r) => r.statut === 'en_cours' || r.statut === 'suivie').length,
      resolues: all.filter((r) => r.statut === 'resolue').length,
    };
  }, [page]);

  const handleCreate = async () => {
    if (!user) return;
    if (!form.titre.trim() || !form.description.trim()) {
      toast.error('Titre et description obligatoires.');
      return;
    }
    try {
      await createMut.mutateAsync({
        titre: form.titre.trim(),
        description: form.description.trim(),
        niveauPriorite: form.niveauPriorite,
        siteId: form.siteId || undefined,
        responsableSuivi: form.responsableSuivi.trim() || undefined,
        dateEcheance: form.dateEcheance || undefined,
        createdBy: user.id,
      });
      toast.success('Recommandation créée.');
      setForm(EMPTY_FORM);
      setCreateOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec.');
    }
  };

  const updateStatut = async (r: Recommandation, statut: RecommandationStatut) => {
    try {
      await updateMut.mutateAsync({ id: r.id, patch: { statut } });
      toast.success(`Statut mis à jour : ${STATUT_LABEL[statut]}.`);
    } catch {
      toast.error('Échec.');
    }
  };

  const handleDelete = async (r: Recommandation) => {
    const ok = await confirm({
      title: `Supprimer "${r.titre}" ?`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(r.id);
      toast.success('Recommandation supprimée.');
    } catch {
      toast.error('Échec.');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>Recommandations</h1>
          <span className={styles.heroSubtitle}>
            Boîte de réception des actions correctives identifiées sur les sites
          </span>
        </div>
        <div className={styles.heroKpis}>
          <div className={styles.kpiTile} data-tone="neutral">
            <Inbox size={14} aria-hidden="true" />
            <span className={styles.kpiValue}>{stats.total}</span>
            <span className={styles.kpiLabel}>Total</span>
          </div>
          <div className={styles.kpiTile} data-tone="danger">
            <AlertOctagon size={14} aria-hidden="true" />
            <span className={styles.kpiValue}>{stats.critiques}</span>
            <span className={styles.kpiLabel}>Critiques</span>
          </div>
          <div className={styles.kpiTile} data-tone="warning">
            <Clock size={14} aria-hidden="true" />
            <span className={styles.kpiValue}>{stats.enCours}</span>
            <span className={styles.kpiLabel}>En cours</span>
          </div>
          <div className={styles.kpiTile} data-tone="success">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span className={styles.kpiValue}>{stats.resolues}</span>
            <span className={styles.kpiLabel}>Résolues</span>
          </div>
        </div>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par titre, description…"
            aria-label="Rechercher une recommandation"
          />
        </label>
        <div className={styles.toolbarFilters}>
          <Select<StatutFilter>
            value={statutFilter}
            onChange={setStatutFilter}
            options={[
              { value: 'all', label: 'Tous statuts' },
              ...(Object.keys(STATUT_LABEL) as RecommandationStatut[]).map((s) => ({
                value: s,
                label: STATUT_LABEL[s],
              })),
            ]}
            aria-label="Filtrer par statut"
          />
          <Select<PrioriteFilter>
            value={prioriteFilter}
            onChange={setPrioriteFilter}
            options={[
              { value: 'all', label: 'Toutes priorités' },
              ...(Object.keys(PRIORITE_LABEL) as RecommandationPriorite[]).map((p) => ({
                value: p,
                label: PRIORITE_LABEL[p],
              })),
            ]}
            aria-label="Filtrer par priorité"
          />
          <Button variant="primary" iconLeft={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            Nouvelle recommandation
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton height={420} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={28} />}
          title="Aucune recommandation"
          description={
            query || statutFilter !== 'all' || prioriteFilter !== 'all'
              ? 'Aucune recommandation ne correspond aux filtres.'
              : 'Ajoutez une première recommandation depuis cet écran ou depuis une fiche collecte.'
          }
        />
      ) : (
        <div className={styles.split}>
          <aside className={styles.list} aria-label="Boîte de réception des recommandations">
            <header className={styles.listHead}>
              <span className={styles.listTitle}>Boîte de réception</span>
              <span className={styles.listCount}>{items.length}</span>
            </header>
            <div className={styles.listScroll}>
              {items.map((r) => {
                const active = (selected?.id ?? items[0]?.id) === r.id;
                const siteLabel = r.siteId ? sitesById.get(r.siteId) ?? r.siteId : 'Transversal';
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`${styles.row} ${active ? styles.rowActive : ''}`}
                    onClick={() => setSelectedId(r.id)}
                    data-statut={r.statut}
                  >
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{r.titre}</span>
                      <span className={styles.rowMeta}>
                        <MapPin size={11} aria-hidden="true" /> {siteLabel}
                        {r.dateEcheance ? (
                          <>
                            <span className={styles.rowDot} aria-hidden="true" />
                            <Calendar size={11} aria-hidden="true" />
                            {formatDateTime(r.dateEcheance, 'dd MMM yyyy')}
                          </>
                        ) : null}
                      </span>
                    </span>
                    <span className={styles.rowRight}>
                      <Badge size="sm" variant={STATUT_VARIANT[r.statut]}>
                        {STATUT_LABEL[r.statut]}
                      </Badge>
                      <span className={styles.rowDate}>{formatRelativeTime(r.createdAt)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={styles.detail} aria-label="Lecture de la recommandation">
            {selected ? (
              <RecommandationDetail
                reco={selected}
                siteName={selected.siteId ? sitesById.get(selected.siteId) : undefined}
                onStatut={(s) => updateStatut(selected, s)}
                onDelete={() => handleDelete(selected)}
                isUpdating={updateMut.isPending}
              />
            ) : (
              <div className={styles.empty}>Sélectionnez une recommandation à gauche.</div>
            )}
          </section>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nouvelle recommandation"
        width={640}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={createMut.isPending}>
              Créer
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <div className={styles.formGridFull}>
            <FormField label="Titre" required>
              <Input
                value={form.titre}
                onChange={(e) => setForm((s) => ({ ...s, titre: e.target.value }))}
                placeholder="Mettre en place un système de neutralisation du pH…"
              />
            </FormField>
          </div>
          <div className={styles.formGridFull}>
            <FormField label="Description" required>
              <Textarea
                rows={5}
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Contexte, action concrète, coût estimé, impact attendu…"
              />
            </FormField>
          </div>
          <FormField label="Priorité" required>
            <Select<RecommandationPriorite>
              value={form.niveauPriorite}
              onChange={(niveauPriorite) => setForm((s) => ({ ...s, niveauPriorite }))}
              options={(Object.keys(PRIORITE_LABEL) as RecommandationPriorite[]).map((p) => ({
                value: p,
                label: PRIORITE_LABEL[p],
              }))}
            />
          </FormField>
          <FormField label="Site concerné">
            <Select<string>
              value={form.siteId}
              onChange={(siteId) => setForm((s) => ({ ...s, siteId }))}
              options={[
                { value: '', label: '— Transversal —' },
                ...(sitesPage?.items ?? []).map((s) => ({ value: s.id, label: s.shortName })),
              ]}
            />
          </FormField>
          <FormField label="Responsable du suivi">
            <Input
              value={form.responsableSuivi}
              onChange={(e) => setForm((s) => ({ ...s, responsableSuivi: e.target.value }))}
              placeholder="Aminata Konaté"
            />
          </FormField>
          <FormField label="Date d'échéance">
            <Input
              type="date"
              value={form.dateEcheance}
              onChange={(e) => setForm((s) => ({ ...s, dateEcheance: e.target.value }))}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}

interface DetailProps {
  reco: Recommandation;
  siteName?: string;
  onStatut: (s: RecommandationStatut) => void;
  onDelete: () => void;
  isUpdating: boolean;
}

function RecommandationDetail({ reco, siteName, onStatut, onDelete, isUpdating }: DetailProps) {
  /* Historique métier : la fixture contient une trace par changement
   * (creation + chaque changement de statut). On la dédupliques par
   * timestamp + kind pour éviter les doublons email/sms. */
  const history = useMemo(() => {
    const list = reco.notifications ?? [];
    const seen = new Set<string>();
    const events: Array<{ id: string; kind: string; at: string; statut?: RecommandationStatut }> = [];
    for (const n of [...list].sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
    )) {
      const key = `${n.kind}|${n.sentAt}|${n.statutSnapshot ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ id: n.id, kind: n.kind, at: n.sentAt, statut: n.statutSnapshot });
    }
    return events;
  }, [reco.notifications]);

  return (
    <>
      <header className={styles.detailHead}>
        <div className={styles.detailHeadMain}>
          <div className={styles.detailEyebrow}>
            <Badge size="sm" variant={PRIORITE_VARIANT[reco.niveauPriorite]}>
              Priorité {PRIORITE_LABEL[reco.niveauPriorite].toLowerCase()}
            </Badge>
            <Badge size="sm" variant={STATUT_VARIANT[reco.statut]}>
              {STATUT_LABEL[reco.statut]}
            </Badge>
          </div>
          <h2 className={styles.detailTitle}>{reco.titre}</h2>
          <div className={styles.detailMeta}>
            {siteName ? (
              <Link to={`/sites/${reco.siteId}`} className={styles.detailMetaLink}>
                <MapPin size={12} aria-hidden="true" /> {siteName}
              </Link>
            ) : (
              <span className={styles.detailMetaItem}>
                <MapPin size={12} aria-hidden="true" /> Recommandation transversale
              </span>
            )}
            {reco.collectionId ? (
              <Link to={`/collecte/${reco.collectionId}`} className={styles.detailMetaLink}>
                Collecte associée
              </Link>
            ) : null}
            <span className={styles.detailMetaItem}>
              <Clock size={12} aria-hidden="true" /> créée {formatRelativeTime(reco.createdAt)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<Trash2 size={14} />}
          onClick={onDelete}
          aria-label="Supprimer la recommandation"
        >
          Supprimer
        </Button>
      </header>

      <article className={styles.detailBody}>
        <section className={styles.descriptionBlock} aria-label="Description">
          <p className={styles.detailDescription}>{reco.description}</p>
        </section>

        <section className={styles.detailStrip} aria-label="Suivi">
          <div className={styles.detailStripItem}>
            <span className={styles.detailStripLabel}>
              <User size={11} aria-hidden="true" /> Responsable
            </span>
            <span className={styles.detailStripValue}>
              {reco.responsableSuivi || <span className={styles.muted}>Non assigné</span>}
            </span>
          </div>
          <div className={styles.detailStripItem}>
            <span className={styles.detailStripLabel}>
              <Calendar size={11} aria-hidden="true" /> Échéance
            </span>
            <span className={styles.detailStripValue}>
              {reco.dateEcheance ? (
                formatDateTime(reco.dateEcheance, 'dd MMM yyyy')
              ) : (
                <span className={styles.muted}>Non fixée</span>
              )}
            </span>
          </div>
          {reco.resultatIndicatorId ? (
            <div className={styles.detailStripItem}>
              <span className={styles.detailStripLabel}>
                <Target size={11} aria-hidden="true" /> Indicateur ciblé
              </span>
              <span className={styles.detailStripValue}>
                <code>{reco.resultatIndicatorId}</code>
              </span>
            </div>
          ) : null}
        </section>

        {history.length > 0 ? (
          <section className={styles.historySection} aria-label="Historique de la recommandation">
            <header className={styles.historyHead}>
              <span className={styles.historyTitle}>Historique</span>
            </header>
            <ol className={styles.historyList}>
              {history.map((e, i) => (
                <li key={e.id} className={styles.historyItem} data-current={i === history.length - 1}>
                  <span className={styles.historyDot} aria-hidden="true" />
                  <span className={styles.historyLabel}>
                    {e.kind === 'created'
                      ? 'Recommandation créée'
                      : e.kind === 'status_changed'
                        ? `Statut → ${e.statut ? STATUT_LABEL[e.statut] : ''}`
                        : "Relance d'échéance envoyée"}
                  </span>
                  <span className={styles.historyTime} title={formatDateTime(e.at)}>
                    {formatRelativeTime(e.at)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </article>

      <footer className={styles.detailActions}>
        <span className={styles.detailActionsLabel}>Faire évoluer le statut</span>
        <div className={styles.statusBar} role="group" aria-label="Changer le statut">
          {(Object.keys(STATUT_LABEL) as RecommandationStatut[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.statusBtn} ${reco.statut === s ? styles.statusBtnActive : ''}`}
              onClick={() => onStatut(s)}
              disabled={reco.statut === s || isUpdating}
              data-statut={s}
            >
              {s === 'resolue' ? <CheckCircle2 size={12} aria-hidden="true" /> : null}
              {STATUT_LABEL[s]}
            </button>
          ))}
        </div>
      </footer>
    </>
  );
}
