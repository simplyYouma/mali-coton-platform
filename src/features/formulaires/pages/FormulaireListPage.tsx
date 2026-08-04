import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Search, ListChecks } from 'lucide-react';
import { Input, Select, Skeleton, EmptyState, Button } from '@/components/common';
import { useFormulaires } from '../hooks/useFormulaires';
import { FormulaireCard } from '../components/FormulaireCard';
import styles from './FormulaireListPage.module.css';

const TYPE_OPTIONS = [
  { value: 'all', label: 'Tous les types' },
  { value: 'visite_initiale', label: 'Visite initiale' },
  { value: 'controle_mensuel', label: 'Contrôle mensuel' },
  { value: 'signalement_incident', label: 'Signalement incident' },
];

export function FormulaireListPage() {
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const { data, isLoading } = useFormulaires();

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.items;
    if (!showArchived) items = items.filter((f) => f.statut !== 'archive');
    if (typeFilter !== 'all') items = items.filter((f) => f.typeFormulaire === typeFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      items = items.filter(
        (f) =>
          f.titre.toLowerCase().includes(s) ||
          f.code.toLowerCase().includes(s) ||
          f.description?.toLowerCase().includes(s),
      );
    }
    return items;
  }, [data, q, typeFilter, showArchived]);

  const publishedCount = data?.items.filter((f) => f.statut === 'publie').length ?? 0;

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>
            <ClipboardList size={14} />
            Formulaires de collecte
          </span>
          <h1 className={styles.heroTitle}>Formulaires</h1>
          <p className={styles.heroDescription}>
            Sélectionnez un formulaire pour saisir vos données terrain.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link to="/formulaires/soumissions">
            <Button variant="ghost-primary" iconLeft={<ListChecks size={16} />}>
              Voir les soumissions
            </Button>
          </Link>
        </div>
      </header>

      {/* Stats rapides */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{data?.total ?? '—'}</span>
          <span className={styles.statLabel}>Formulaires</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{publishedCount}</span>
          <span className={styles.statLabel}>Publiés</span>
        </div>
      </div>

      {/* Toolbar filtres */}
      <section className={styles.toolbar} aria-label="Filtres formulaires">
        <div className={styles.searchInput}>
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un formulaire…"
            prefix={<Search size={16} />}
            aria-label="Rechercher un formulaire"
          />
        </div>
        <Select<string>
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_OPTIONS}
          aria-label="Filtrer par type"
        />
        <label className={styles.archivedToggle}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Afficher les archivés
        </label>
      </section>

      {/* Liste */}
      <div className={styles.list}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={96} radius={12} />)
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="Aucun formulaire trouvé"
            description="Ajustez les filtres ou contactez un administrateur."
          />
        ) : (
          filtered.map((formulaire) => (
            <FormulaireCard key={formulaire.id} formulaire={formulaire} />
          ))
        )}
      </div>
    </div>
  );
}
