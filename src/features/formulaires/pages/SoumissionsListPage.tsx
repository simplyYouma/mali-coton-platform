import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks, Search, ChevronLeft, ClipboardList } from 'lucide-react';
import {
  Input,
  Select,
  Skeleton,
  EmptyState,
  Badge,
  Button,
} from '@/components/common';
import { useSoumissions } from '../hooks/useFormulaires';
import {
  STATUT_SOUMISSION_LABEL,
  STATUT_SOUMISSION_VARIANT,
  valeurReponse,
  type StatutSoumission,
} from '../api/formulaires.types';
import styles from './SoumissionsListPage.module.css';

const STATUT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'soumis', label: 'Soumis' },
  { value: 'valide', label: 'Validé' },
  { value: 'rejete', label: 'Rejeté' },
];

export function SoumissionsListPage() {
  const [q, setQ] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const { data, isLoading } = useSoumissions();

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.items;
    if (statutFilter !== 'all')
      items = items.filter((s) => s.statut === (statutFilter as StatutSoumission));
    if (q.trim()) {
      const search = q.toLowerCase();
      items = items.filter(
        (s) =>
          s.formulaire.titre.toLowerCase().includes(search) ||
          s.soumisPar.toLowerCase().includes(search) ||
          String(s.id).includes(search),
      );
    }
    return items.sort(
      (a, b) => new Date(b.dateSoumission).getTime() - new Date(a.dateSoumission).getTime(),
    );
  }, [data, q, statutFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <Link to="/formulaires" className={styles.backLink}>
            <ChevronLeft size={14} />
            Formulaires
          </Link>
          <span className={styles.heroEyebrow}>
            <ListChecks size={14} />
            Historique
          </span>
          <h1 className={styles.heroTitle}>Soumissions</h1>
          <p className={styles.heroDescription}>
            Toutes les saisies enregistrées via les formulaires de collecte.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link to="/formulaires">
            <Button variant="primary" iconLeft={<ClipboardList size={16} />}>
              Remplir un formulaire
            </Button>
          </Link>
        </div>
      </header>

      {/* Toolbar */}
      <section className={styles.toolbar} aria-label="Filtres soumissions">
        <div className={styles.searchInput}>
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par formulaire, agent…"
            prefix={<Search size={16} />}
            aria-label="Rechercher une soumission"
          />
        </div>
        <Select<string>
          value={statutFilter}
          onChange={setStatutFilter}
          options={STATUT_OPTIONS}
          aria-label="Filtrer par statut"
        />
      </section>

      {/* Tableau */}
      <div className={styles.tableWrap}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={52} radius={6} />)
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ListChecks size={24} />}
            title="Aucune soumission trouvée"
            description="Remplissez un formulaire pour commencer."
            action={
              <Link to="/formulaires">
                <Button variant="primary">Remplir un formulaire</Button>
              </Link>
            }
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Formulaire</th>
                <th>Site</th>
                <th>Agent</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Réponses</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((s) => (
                <tr key={s.id} className={styles.row}>
                  <td className={styles.cellFormulaire}>
                    <span className={styles.formulaireTitre}>{s.formulaire.titre}</span>
                    <span className={styles.formulaireCode}>{s.formulaire.code}</span>
                  </td>
                  <td className={styles.cellMuted}>
                    {s.siteTeinture ? `…/${s.siteTeinture.split('/').pop()}` : '—'}
                  </td>
                  <td>{s.soumisPar}</td>
                  <td className={styles.cellDate}>
                    {new Date(s.dateSoumission).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td>
                    <Badge variant={STATUT_SOUMISSION_VARIANT[s.statut]}>
                      {STATUT_SOUMISSION_LABEL[s.statut]}
                    </Badge>
                  </td>
                  <td className={styles.cellReponses}>
                    {s.reponses.length > 0 ? (
                      <span className={styles.reponseCount}>{s.reponses.length} réponse{s.reponses.length > 1 ? 's' : ''}</span>
                    ) : (
                      <span className={styles.cellMuted}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE ? (
        <nav className={styles.pagination} aria-label="Pagination">
          <span className={styles.paginationInfo}>
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} sur{' '}
            {filtered.length}
          </span>
          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              Précédent
            </button>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              Suivant
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

// Utilisé uniquement dans le tableau pour éviter l'import inutilisé
void valeurReponse;
