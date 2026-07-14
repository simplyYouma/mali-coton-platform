import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button, Skeleton } from '@/components/common';
import { useImportHistory, useKoboImport } from '../hooks/useKoboImport';
import type { KoboImportStats, KoboImportType } from '../api/koboImport';
import styles from './CollectionImportPage.module.css';

const TYPE_OPTIONS: Array<{
  value: KoboImportType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'sites',
    label: 'Sites de teinture',
    description: 'Synchronise les fiches de sites depuis KoboToolbox',
    icon: <MapPin size={22} />,
  },
  {
    value: 'employes',
    label: 'Employés',
    description: 'Synchronise les fiches agents et employés depuis Kobo',
    icon: <Users size={22} />,
  },
  {
    value: 'all',
    label: 'Tout synchroniser',
    description: 'Sites et employés importés en une seule opération',
    icon: <Zap size={22} />,
  },
];

const TYPE_LABEL: Record<KoboImportType, string> = {
  sites: 'Sites de teinture',
  employes: 'Employés',
  all: 'Tout',
};

function n(v: number | null | undefined): number {
  return v ?? 0;
}

function StatCards({
  label,
  stats,
}: {
  label?: string;
  stats: Partial<KoboImportStats>;
}) {
  return (
    <div className={styles.statsBlock}>
      {label && <span className={styles.statsBlockLabel}>{label}</span>}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total récupéré</span>
          <span className={styles.statValue}>{n(stats.totalRecupere)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Importé</span>
          <span className={`${styles.statValue} ${styles.statSuccess}`}>
            {n(stats.nombreImporte)}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Ignoré</span>
          <span className={`${styles.statValue} ${styles.statWarning}`}>
            {n(stats.nombreIgnore)}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Erreurs</span>
          <span className={`${styles.statValue} ${styles.statDanger}`}>
            {n(stats.nombreErreurs)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CollectionImportPage() {
  const navigate = useNavigate();
  const importMut = useKoboImport();
  const {
    data: history = [],
    isLoading: histLoading,
    isError: histError,
    error: histFetchError,
    refetch: refetchHistory,
  } = useImportHistory();
  const [selected, setSelected] = useState<KoboImportType | null>(null);

  const phase: 'idle' | 'loading' | 'done' =
    importMut.status === 'pending'
      ? 'loading'
      : importMut.status === 'idle'
        ? 'idle'
        : 'done';

  const handleLaunch = () => {
    if (!selected) return;
    importMut.mutate(selected);
  };

  const handleReset = () => {
    importMut.reset();
    setSelected(null);
  };

  const result = importMut.data;
  const importError = importMut.error;

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Source terrain · KoboToolbox</span>
          <h1 className={styles.heroTitle}>Importer depuis Kobo</h1>
          <p className={styles.heroDescription}>
            Déclenchez une synchronisation depuis KoboToolbox pour importer les données terrain.
          </p>
        </div>
        <Button
          variant="ghost"
          iconLeft={<ArrowLeft size={14} />}
          onClick={() => navigate('/collecte')}
        >
          Retour aux collectes
        </Button>
      </header>

      {/* ─── Sélection du type ─── */}
      {phase === 'idle' && (
        <section className={styles.typeSection}>
          <h2 className={styles.sectionTitle}>Choisir le type de données</h2>
          <div className={styles.typeGrid}>
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.typeCard} ${selected === opt.value ? styles.typeCardActive : ''}`}
                onClick={() => setSelected(opt.value)}
                aria-pressed={selected === opt.value}
              >
                <span className={styles.typeIcon}>{opt.icon}</span>
                <span className={styles.typeLabel}>{opt.label}</span>
                <span className={styles.typeDesc}>{opt.description}</span>
              </button>
            ))}
          </div>
          <div className={styles.launchRow}>
            <Button
              variant="success"
              iconLeft={<RefreshCw size={14} />}
              onClick={handleLaunch}
              disabled={!selected}
            >
              {selected
                ? `Synchroniser · ${TYPE_LABEL[selected]}`
                : 'Sélectionnez un type pour continuer'}
            </Button>
          </div>
        </section>
      )}

      {/* ─── Chargement ─── */}
      {phase === 'loading' && (
        <div className={styles.loadingBox}>
          <span className={styles.spinner} aria-hidden="true" />
          <div>
            <strong>Synchronisation en cours…</strong>
            <p>
              Connexion à KoboToolbox
              {selected ? ` — ${TYPE_LABEL[selected]}` : ''}.
            </p>
          </div>
        </div>
      )}

      {/* ─── Résultat ─── */}
      {phase === 'done' && (
        <>
          {importMut.isSuccess && result ? (
            <div className={result.success ? styles.resultSuccess : styles.resultError}>
              <div className={styles.resultHeader}>
                {result.success ? (
                  <CheckCircle2 size={20} aria-hidden="true" />
                ) : (
                  <XCircle size={20} aria-hidden="true" />
                )}
                <strong>{result.message}</strong>
              </div>

              {/* Réponse "all" — stats par catégorie */}
              {result.type === 'all' && (result.sites || result.employes) ? (
                <div className={styles.allStatsWrapper}>
                  {result.sites && (
                    <StatCards label="Sites de teinture" stats={result.sites} />
                  )}
                  {result.employes && (
                    <StatCards label="Employés" stats={result.employes} />
                  )}
                </div>
              ) : (
                /* Réponse type unique */
                <StatCards
                  stats={{
                    totalRecupere: result.totalRecupere ?? undefined,
                    nombreImporte: result.nombreImporte ?? undefined,
                    nombreIgnore: result.nombreIgnore ?? undefined,
                    nombreErreurs: result.nombreErreurs ?? undefined,
                  }}
                />
              )}

              {(result.erreursDetaillees ?? []).length > 0 && (
                <details className={styles.errorDetails}>
                  <summary>Détails des erreurs ({result.erreursDetaillees!.length})</summary>
                  <ul className={styles.errorList}>
                    {result.erreursDetaillees!.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ) : (
            <div className={styles.resultError}>
              <div className={styles.resultHeader}>
                <XCircle size={20} aria-hidden="true" />
                <strong>La synchronisation a échoué</strong>
              </div>
              <p className={styles.errorMsg}>
                {importError instanceof Error ? importError.message : 'Erreur inconnue.'}
              </p>
            </div>
          )}

          <div className={styles.launchRow}>
            <Button variant="ghost" iconLeft={<RefreshCw size={14} />} onClick={handleReset}>
              Réimporter
            </Button>
            <Button
              variant="primary"
              iconLeft={<ArrowLeft size={14} />}
              onClick={() => navigate('/collecte')}
            >
              Voir les collectes
            </Button>
          </div>
        </>
      )}

      {/* ─── Historique des imports ─── */}
      {phase !== 'loading' && (
        <section className={styles.historySection}>
          <div className={styles.historyHeader}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              Historique des imports Kobo
            </h2>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<RefreshCw size={12} />}
              onClick={() => void refetchHistory()}
            >
              Rafraîchir
            </Button>
          </div>

          {histLoading ? (
            <div className={styles.skeletons}>
              <Skeleton height={44} />
              <Skeleton height={44} />
              <Skeleton height={44} />
            </div>
          ) : histError ? (
            <div className={styles.histErrorBox}>
              <AlertCircle size={16} />
              <span>
                Impossible de charger l'historique
                {histFetchError instanceof Error ? ` : ${histFetchError.message}` : '.'}
              </span>
            </div>
          ) : history.length === 0 ? (
            <p className={styles.emptyHint}>Aucun import Kobo enregistré pour le moment.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Soumissions</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={String(h.id)}>
                      <td>{new Date(h.createdAt).toLocaleString('fr-FR')}</td>
                      <td>{h.typeFormulaire}</td>
                      <td>{h.nombreSoumissions}</td>
                      <td>
                        <span
                          className={
                            h.statut === 'success' ? styles.statusOk : styles.statusError
                          }
                        >
                          {h.statut === 'success' ? 'Succès' : 'Erreur'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
