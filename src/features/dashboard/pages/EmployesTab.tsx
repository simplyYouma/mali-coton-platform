import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Banknote, ClipboardList, Droplet, HeartPulse, ShieldCheck, UsersRound } from 'lucide-react';
import { SkeletonBandeStats, Skeleton } from '@/components/common';
import { exportRowsToXlsx, noteScopeSitesActifs } from '@/lib/xlsxExport';
import { HttpError } from '@/lib/http';
import { EnvKpi } from '../components/EnvKpi';
import { DonutChart } from '../components/DonutChart';
import { ClassementCard } from '../components/ClassementCard';
import { RepartitionBarres } from '../components/RepartitionBarres';
import { EvolutionChart } from '../components/EvolutionChart';
import type { FiltresDashboard } from '../api/dashboardStats';
import {
  useEmployesBesoins,
  useEmployesEquipementsProtection,
  useEmployesEvolutionCollectes,
  useEmployesParSite,
  useEmployesRepartitionContrat,
  useEmployesRepartitionGenre,
  useEmployesRepartitionInstruction,
  useEmployesSanteSecurite,
  useEmployesVueEnsemble,
} from '../hooks/useDashboardStats';
import styles from './DashboardPage.module.css';

export function EmployesTab({
  filtres,
  actif,
  onRegistrarExport,
}: {
  filtres: FiltresDashboard;
  actif: boolean;
  onRegistrarExport: (fn: (() => void) | null) => void;
}) {
  const { data: kpi, isLoading: chargementKpi, isError: kpiEnErreur, error: kpiErreur } =
    useEmployesVueEnsemble(filtres, actif);
  const evolution = useEmployesEvolutionCollectes(filtres, actif);
  const genre = useEmployesRepartitionGenre(filtres, actif);
  const contrat = useEmployesRepartitionContrat(filtres, actif);
  const instruction = useEmployesRepartitionInstruction(filtres, actif);
  const parSite = useEmployesParSite(filtres, actif);
  const equipements = useEmployesEquipementsProtection(filtres, actif);
  const besoins = useEmployesBesoins(filtres, actif);
  const santeSecurite = useEmployesSanteSecurite(filtres, actif);

  useEffect(() => {
    if (!kpi) {
      onRegistrarExport(null);
      return;
    }
    onRegistrarExport(() => {
      exportRowsToXlsx({
        filename: 'employes_vue_ensemble',
        sheetName: 'Employés',
        columns: [
          { header: 'Total employés', accessor: (k) => k.totalEmployes },
          { header: 'Nombre de collectes', accessor: (k) => k.nombreCollectes },
          { header: 'Taux utilisation EPI (%)', accessor: (k) => k.tauxUtilisationEpi },
          { header: 'Taux accident travail (%)', accessor: (k) => k.tauxAccidentTravail },
          { header: 'Taux accès eau potable (%)', accessor: (k) => k.tauxAccesEauPotable },
          { header: 'Revenu mensuel moyen (FCFA)', accessor: (k) => Math.round(k.revenuMensuelMoyen) },
        ],
        rows: [kpi],
        note: noteScopeSitesActifs(),
      });
    });
    return () => onRegistrarExport(null);
  }, [kpi, onRegistrarExport]);

  const genreItems = genre.data ?? [];
  const totalGenre = genreItems.reduce((s, i) => s + i.nombre, 0);
  const GENRE_COULEURS: Record<string, string> = {
    Femme: 'var(--color-primary)',
    Homme: 'var(--color-primary-hover)',
  };

  const parSiteTries = [...(parSite.data ?? [])].sort((a, b) => b.nombreEmployes - a.nombreEmployes);
  const maxParSite = Math.max(1, ...parSiteTries.map((s) => s.nombreEmployes));

  return (
    <div className={styles.envGroup}>
      <p className={styles.bandeauLimite}>
        <AlertTriangle size={13} aria-hidden="true" />
        <span>
          Ces indicateurs viennent des fiches Employé importées de Kobo, pas des formulaires
          natifs de collecte — une saisie native récente n’apparaît pas encore ici.
        </span>
      </p>

      {kpiEnErreur ? (
        <p className={styles.classementErreur}>
          {kpiErreur instanceof HttpError ? kpiErreur.message : 'Indicateurs indisponibles.'}
        </p>
      ) : chargementKpi ? (
        <SkeletonBandeStats colonnes={5} />
      ) : kpi ? (
        <div className={styles.envCard}>
          <div className={styles.envKpiGrid}>
            <EnvKpi icon={<UsersRound size={18} />} label="Employés"
              value={kpi.totalEmployes.toLocaleString('fr-FR')} sub="effectif recensé" tone="neutral" />
            <EnvKpi icon={<ClipboardList size={18} />} label="Collectes"
              value={kpi.nombreCollectes.toLocaleString('fr-FR')} sub="sur la période sélectionnée" tone="neutral" />
            <EnvKpi icon={<ShieldCheck size={18} />} label="Utilisation EPI"
              value={`${kpi.tauxUtilisationEpi.toFixed(1)} %`} sub="employés utilisant leurs EPI" tone="neutral" />
            <EnvKpi icon={<HeartPulse size={18} />} label="Accidents du travail"
              value={`${kpi.tauxAccidentTravail.toFixed(1)} %`} sub="employés ayant déclaré un accident" tone="neutral" />
            <EnvKpi icon={<Droplet size={18} />} label="Accès à l’eau potable"
              value={`${kpi.tauxAccesEauPotable.toFixed(1)} %`} sub="employés avec accès déclaré" tone="neutral" />
            <EnvKpi icon={<Banknote size={18} />} label="Revenu mensuel moyen"
              value={`${Math.round(kpi.revenuMensuelMoyen).toLocaleString('fr-FR')} FCFA`}
              sub="moyenne déclarée" tone="neutral" />
          </div>
        </div>
      ) : null}

      <EvolutionChart
        titre="Évolution des collectes"
        sousTitre="Nombre de fiches employé collectées par mois"
        donnees={evolution.data}
        isLoading={evolution.isLoading}
        isError={evolution.isError}
        erreur={evolution.error}
      />

      <div className={styles.envRow} style={{ gridTemplateColumns: '320px 1fr' }}>
        <div className={`${styles.envCard} ${styles.envDonutCol}`}>
          <h3 className={styles.envSubTitle}>Répartition par genre</h3>
          {genre.isLoading ? (
            <Skeleton height={190} radius={95} />
          ) : genre.isError ? (
            <p className={styles.classementErreur}>
              {genre.error instanceof HttpError ? genre.error.message : 'Donnée indisponible.'}
            </p>
          ) : genreItems.length === 0 ? (
            <p className={styles.classementVide}>Aucune donnée pour ce périmètre.</p>
          ) : (
            <div className={styles.envDonutInner}>
              <DonutChart
                segments={genreItems.map((g) => ({
                  valeur: g.nombre,
                  couleur: GENRE_COULEURS[g.libelle] ?? 'var(--color-text-muted)',
                  label: g.libelle,
                }))}
                total={totalGenre}
                centreValeur={String(totalGenre)}
                centreLabel="Employés"
              />
              <ul className={styles.donutLegend}>
                {genreItems.map((g) => (
                  <li key={g.libelle} className={styles.donutLegendRow}>
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                        background: GENRE_COULEURS[g.libelle] ?? 'var(--color-text-muted)', flexShrink: 0,
                      }}
                    />
                    <span className={styles.ldLabel}>{g.libelle}</span>
                    <span className={styles.ldCount}>
                      {g.nombre.toLocaleString('fr-FR')} ({totalGenre > 0 ? ((g.nombre / totalGenre) * 100).toFixed(1) : '0'} %)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.envRow} style={{ gridTemplateColumns: '1fr 1fr' }}>
          <RepartitionBarres
            titre="Répartition par contrat"
            sousTitre="Nombre d’employés par type de contrat"
            donnees={contrat.data}
            unite="employés"
            isLoading={contrat.isLoading}
            isError={contrat.isError}
            erreur={contrat.error}
          />
          <RepartitionBarres
            titre="Répartition par instruction"
            sousTitre="Nombre d’employés par niveau d’instruction"
            donnees={instruction.data}
            unite="employés"
            isLoading={instruction.isLoading}
            isError={instruction.isError}
            erreur={instruction.error}
          />
        </div>
      </div>

      <div className={`${styles.envCard} ${styles.envComposanteCol}`}>
        <h3 className={styles.envSubTitle}>Effectif par site</h3>
        <p className={styles.classementSousTitre}>Les 10 sites employant le plus de personnel</p>
        {parSite.isLoading ? (
          <div className={styles.classementSkeleton}>
            {[0, 1, 2].map((i) => <Skeleton key={i} height={26} radius={6} />)}
          </div>
        ) : parSite.isError ? (
          <p className={styles.classementErreur}>
            {parSite.error instanceof HttpError ? parSite.error.message : 'Donnée indisponible.'}
          </p>
        ) : parSiteTries.length === 0 ? (
          <p className={styles.classementVide}>Aucune donnée pour ce périmètre.</p>
        ) : (
          <ul className={styles.repartitionListe}>
            {parSiteTries.map((s) => (
              <li key={s.siteId} className={styles.repartitionLigne}>
                <Link to={`/sites/${s.siteId}`} className={styles.repartitionLibelle}>
                  {s.nomSite || s.codeSite}
                </Link>
                <div className={styles.repartitionTrack}>
                  <div className={styles.repartitionFill} style={{ width: `${(s.nombreEmployes / maxParSite) * 100}%` }} />
                </div>
                <span className={styles.repartitionValeur}>{s.nombreEmployes.toLocaleString('fr-FR')} employés</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.grilleClassements}>
        <ClassementCard titre="Équipements de protection" sousTitre="Employés utilisant cet équipement"
          donnees={equipements.data} total={kpi?.totalEmployes ?? 0} unite="employés"
          isLoading={equipements.isLoading} isError={equipements.isError} erreur={equipements.error} />
        <ClassementCard titre="Besoins" sousTitre="Employés exprimant ce besoin"
          donnees={besoins.data} total={kpi?.totalEmployes ?? 0} unite="employés"
          isLoading={besoins.isLoading} isError={besoins.isError} erreur={besoins.error} />
        <ClassementCard titre="Santé & sécurité" sousTitre="Employés signalant ce problème"
          donnees={santeSecurite.data} total={kpi?.totalEmployes ?? 0} unite="employés"
          isLoading={santeSecurite.isLoading} isError={santeSecurite.isError} erreur={santeSecurite.error} />
      </div>
    </div>
  );
}
