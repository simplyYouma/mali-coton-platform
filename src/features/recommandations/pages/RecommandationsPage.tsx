import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ListChecks, Plus, Search, Trash2 } from 'lucide-react';
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
    if (!window.confirm(`Supprimer la recommandation "${r.titre}" ?`)) return;
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
          <span className={styles.heroCount}>
            {stats.total} au total · {stats.critiques} critique{stats.critiques > 1 ? 's' : ''} · {stats.enCours} en cours · {stats.resolues} résolue{stats.resolues > 1 ? 's' : ''}
          </span>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.search}>
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher une recommandation"
            />
          </div>
          <Button variant="primary" iconLeft={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
            Ajouter
          </Button>
        </div>
      </header>

      <div className={styles.toolbar}>
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
          <aside className={styles.list} aria-label="Liste des recommandations">
            {items.map((r) => {
              const active = (selected?.id ?? items[0]?.id) === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`${styles.row} ${active ? styles.rowActive : ''}`}
                  onClick={() => setSelectedId(r.id)}
                  data-priorite={r.niveauPriorite}
                >
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>{r.titre}</span>
                    <span className={styles.rowMeta}>
                      {r.siteId ? sitesById.get(r.siteId) ?? r.siteId : 'Transversal'}
                      {' · '}
                      {STATUT_LABEL[r.statut]}
                    </span>
                  </div>
                  <Badge size="sm" variant={PRIORITE_VARIANT[r.niveauPriorite]}>
                    {PRIORITE_LABEL[r.niveauPriorite]}
                  </Badge>
                </button>
              );
            })}
          </aside>

          <section className={styles.detail} aria-label="Détail recommandation">
            {selected ? (
              <RecommandationDetail
                reco={selected}
                siteName={selected.siteId ? sitesById.get(selected.siteId) : undefined}
                onStatut={(s) => updateStatut(selected, s)}
                onDelete={() => handleDelete(selected)}
                isUpdating={updateMut.isPending}
              />
            ) : (
              <div className={styles.empty}>Sélectionnez une recommandation.</div>
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
          <FormField label="Site concerné" hint="Laissez vide pour une recommandation transversale.">
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
  return (
    <>
      <header className={styles.detailHead}>
        <div className={styles.detailHeadMain}>
          <div className={styles.detailEyebrow}>
            <Badge size="sm" variant={PRIORITE_VARIANT[reco.niveauPriorite]}>
              {PRIORITE_LABEL[reco.niveauPriorite]}
            </Badge>
            <Badge size="sm" variant={STATUT_VARIANT[reco.statut]}>
              {STATUT_LABEL[reco.statut]}
            </Badge>
          </div>
          <h2 className={styles.detailTitle}>{reco.titre}</h2>
          <div className={styles.detailMeta}>
            {siteName ? (
              <Link to={`/sites/${reco.siteId}`} className={styles.detailMetaLink}>
                {siteName}
              </Link>
            ) : (
              <span>Recommandation transversale</span>
            )}
            {reco.collectionId ? (
              <>
                <span>·</span>
                <Link to={`/collecte/${reco.collectionId}`} className={styles.detailMetaLink}>
                  Collecte associée
                </Link>
              </>
            ) : null}
            <span>·</span>
            <span>créée {formatRelativeTime(reco.createdAt)}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<Trash2 size={14} />}
          onClick={onDelete}
          aria-label="Supprimer"
        >
          Supprimer
        </Button>
      </header>

      <p className={styles.detailDescription}>{reco.description}</p>

      <dl className={styles.detailStrip}>
        {reco.responsableSuivi ? (
          <span>
            <dt>Responsable</dt>
            <dd>{reco.responsableSuivi}</dd>
          </span>
        ) : null}
        {reco.dateEcheance ? (
          <span>
            <dt>Échéance</dt>
            <dd>{formatDateTime(reco.dateEcheance, 'dd MMM yyyy')}</dd>
          </span>
        ) : null}
        {reco.resultatIndicatorId ? (
          <span>
            <dt>Indicateur ciblé</dt>
            <dd>
              <code>{reco.resultatIndicatorId}</code>
            </dd>
          </span>
        ) : null}
      </dl>

      <footer className={styles.detailActions}>
        <span className={styles.detailActionsLabel}>Changer le statut :</span>
        {(Object.keys(STATUT_LABEL) as RecommandationStatut[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.statusBtn} ${reco.statut === s ? styles.statusBtnActive : ''}`}
            onClick={() => onStatut(s)}
            disabled={reco.statut === s || isUpdating}
          >
            {s === 'resolue' ? <CheckCircle2 size={12} /> : null}
            {STATUT_LABEL[s]}
          </button>
        ))}
      </footer>
    </>
  );
}
