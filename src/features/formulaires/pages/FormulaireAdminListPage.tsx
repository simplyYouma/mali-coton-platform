import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ClipboardList,
  Pencil,
  Trash2,
  ListChecks,
  Power,
  PowerOff,
} from 'lucide-react';
import {
  Button,
  Badge,
  Skeleton,
  EmptyState,
} from '@/components/common';
import {
  useFormulaires,
  useDeleteFormulaire,
  useUpdateFormulaire,
} from '../hooks/useFormulaires';
import {
  STATUT_FORMULAIRE_LABEL,
  STATUT_FORMULAIRE_VARIANT,
  type FormulaireCollecte,
} from '../api/formulaires.types';
import styles from './FormulaireAdminListPage.module.css';

export function FormulaireAdminListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('all');

  const { data, isLoading } = useFormulaires();
  const deleteMut = useDeleteFormulaire();
  const updateMut = useUpdateFormulaire();

  const items = data?.items ?? [];

  const filtered = items.filter((f) => {
    const matchQ =
      q === '' ||
      f.titre.toLowerCase().includes(q.toLowerCase()) ||
      f.code.toLowerCase().includes(q.toLowerCase());
    const matchStatut = statutFilter === 'all' || f.statut === statutFilter;
    return matchQ && matchStatut;
  });

  const counts = {
    total: items.length,
    actifs: items.filter((f) => f.actif && f.statut === 'publie').length,
    brouillons: items.filter((f) => f.statut === 'brouillon').length,
    archives: items.filter((f) => f.statut === 'archive').length,
  };

  const handleDelete = (f: FormulaireCollecte) => {
    if (!confirm(`Supprimer le formulaire "${f.titre}" ? Cette action est irréversible.`)) return;
    deleteMut.mutate(String(f.id));
  };

  const handleToggleActif = (f: FormulaireCollecte) => {
    updateMut.mutate({ id: String(f.id), input: { actif: !f.actif } });
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.eyebrow}>
            <ClipboardList size={14} /> Administration
          </span>
          <h1 className={styles.heroTitle}>Formulaires de collecte</h1>
          <p className={styles.heroDesc}>
            Créez et gérez les modèles de formulaires utilisés par les agents sur le terrain.
          </p>
        </div>
        <Button
          variant="primary"
          iconLeft={<Plus size={16} />}
          onClick={() => navigate('/admin/formulaires/nouveau')}
        >
          Nouveau formulaire
        </Button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        {[
          { label: 'Total', value: counts.total },
          { label: 'Publiés actifs', value: counts.actifs },
          { label: 'Brouillons', value: counts.brouillons },
          { label: 'Archivés', value: counts.archives },
        ].map((s) => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Rechercher par titre ou code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
        >
          <option value="all">Tous les statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="publie">Publié</option>
          <option value="archive">Archivé</option>
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={72} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun formulaire"
          description={
            q || statutFilter !== 'all'
              ? 'Aucun résultat pour ces filtres.'
              : 'Créez votre premier formulaire de collecte.'
          }
          action={
            !q && statutFilter === 'all' ? (
              <Button
                variant="primary"
                iconLeft={<Plus size={16} />}
                onClick={() => navigate('/admin/formulaires/nouveau')}
              >
                Nouveau formulaire
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Formulaire</span>
            <span>Type</span>
            <span>Statut</span>
            <span className={styles.center}>Version</span>
            <span className={styles.center}>Champs</span>
            <span className={styles.center}>Actif</span>
            <span className={styles.right}>Actions</span>
          </div>
          {filtered.map((f) => (
            <div key={f.id} className={styles.tableRow}>
              <div className={styles.titleCol}>
                <span className={styles.titre}>{f.titre}</span>
                <span className={styles.code}>{f.code}</span>
              </div>
              <span className={styles.type}>{f.typeFormulaire}</span>
              <Badge variant={STATUT_FORMULAIRE_VARIANT[f.statut]} size="sm">
                {STATUT_FORMULAIRE_LABEL[f.statut]}
              </Badge>
              <span className={styles.center}>v{f.version}</span>
              <span className={styles.center}>{f.champs?.length ?? 0}</span>
              <span className={styles.center}>
                <span className={clsx(styles.dot, f.actif ? styles.dotOn : styles.dotOff)} />
              </span>
              <div className={styles.actions}>
                <button
                  className={styles.actionBtn}
                  title="Gérer les champs"
                  onClick={() => navigate(`/admin/formulaires/${f.id}/champs`)}
                >
                  <ListChecks size={15} />
                </button>
                <button
                  className={styles.actionBtn}
                  title="Éditer"
                  onClick={() => navigate(`/admin/formulaires/${f.id}/editer`)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className={styles.actionBtn}
                  title={f.actif ? 'Désactiver' : 'Activer'}
                  onClick={() => handleToggleActif(f)}
                  disabled={updateMut.isPending}
                >
                  {f.actif ? <PowerOff size={15} /> : <Power size={15} />}
                </button>
                <button
                  className={clsx(styles.actionBtn, styles.actionDanger)}
                  title="Supprimer"
                  onClick={() => handleDelete(f)}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function clsx(...args: (string | false | undefined)[]) {
  return args.filter(Boolean).join(' ');
}
