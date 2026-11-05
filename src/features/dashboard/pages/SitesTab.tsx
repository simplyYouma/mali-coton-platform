import { useEffect } from 'react';
import { AlertTriangle, CalendarCheck, MapPin, Navigation, ShieldCheck, UsersRound } from 'lucide-react';
import { SkeletonBandeStats } from '@/components/common';
import { exportRowsToXlsx, noteScopeSitesActifs } from '@/lib/xlsxExport';
import { HttpError } from '@/lib/http';
import { EnvKpi } from '../components/EnvKpi';
import { ClassementCard } from '../components/ClassementCard';
import { RepartitionBarres } from '../components/RepartitionBarres';
import { EvolutionChart } from '../components/EvolutionChart';
import type { FiltresDashboard } from '../api/dashboardStats';
import {
  useSitesAppuisRecus,
  useSitesBesoinsPrioritaires,
  useSitesEpi,
  useSitesEquipements,
  useSitesEvolutionVisites,
  useSitesFormationsRecues,
  useSitesRepartitionRegion,
  useSitesRepartitionType,
  useSitesRisquesSecurite,
  useSitesTypesTeinture,
  useSitesVueEnsemble,
} from '../hooks/useDashboardStats';
import styles from './DashboardPage.module.css';

export function SitesTab({
  filtres,
  actif,
  sitesActifsCount,
  onRegistrarExport,
}: {
  filtres: FiltresDashboard;
  actif: boolean;
  /** Nombre de sites actifs connus du front — pour signaler l'écart avec kpi.totalSites. */
  sitesActifsCount: number;
  onRegistrarExport: (fn: (() => void) | null) => void;
}) {
  const { data: kpi, isLoading: chargementKpi, isError: kpiEnErreur, error: kpiErreur } =
    useSitesVueEnsemble(filtres, actif);
  const evolution = useSitesEvolutionVisites(filtres, actif);
  const region = useSitesRepartitionRegion(filtres, actif);
  const type = useSitesRepartitionType(filtres, actif);
  const epi = useSitesEpi(filtres, actif);
  const risques = useSitesRisquesSecurite(filtres, actif);
  const besoins = useSitesBesoinsPrioritaires(filtres, actif);
  const formations = useSitesFormationsRecues(filtres, actif);
  const appuis = useSitesAppuisRecus(filtres, actif);
  const teintures = useSitesTypesTeinture(filtres, actif);
  const equipements = useSitesEquipements(filtres, actif);

  useEffect(() => {
    if (!kpi) {
      onRegistrarExport(null);
      return;
    }
    onRegistrarExport(() => {
      exportRowsToXlsx({
        filename: 'sites_vue_ensemble',
        sheetName: 'Sites',
        columns: [
          { header: 'Total sites', accessor: (k) => k.totalSites },
          { header: 'Sites géolocalisés', accessor: (k) => k.sitesGeolocalises },
          { header: 'Effectif total', accessor: (k) => k.effectifTotal },
          { header: 'Effectif femmes', accessor: (k) => k.effectifFemmes },
          { header: 'Effectif hommes', accessor: (k) => k.effectifHommes },
          { header: 'Nombre de visites', accessor: (k) => k.nombreVisites },
          { header: 'Taux formation EPI (%)', accessor: (k) => k.tauxFormationEpi },
        ],
        rows: [kpi],
        note: noteScopeSitesActifs(),
      });
    });
    return () => onRegistrarExport(null);
  }, [kpi, onRegistrarExport]);

  /* La comparaison n'a de sens que sur le périmètre complet — un site filtré
   * réduit kpi.totalSites à 1 et rendrait l'écart absurde face au total
   * global de sites actifs. */
  const comparaisonPertinente = !filtres.siteId;
  const ecartSites =
    comparaisonPertinente && kpi && kpi.totalSites !== sitesActifsCount
      ? kpi.totalSites - sitesActifsCount
      : 0;

  return (
    <div className={styles.envGroup}>
      <p className={styles.bandeauLimite}>
        <AlertTriangle size={13} aria-hidden="true" />
        <span>
          Ces indicateurs viennent des fiches Site importées de Kobo, pas des formulaires natifs
          de collecte — une saisie native récente n’apparaît pas encore ici.
        </span>
      </p>

      {ecartSites !== 0 ? (
        <p className={styles.bandeauEcart}>
          <AlertTriangle size={13} aria-hidden="true" />
          <span>
            Le backend compte {kpi?.totalSites} site{(kpi?.totalSites ?? 0) > 1 ? 's' : ''}
            {' '}({sitesActifsCount} actif{sitesActifsCount > 1 ? 's' : ''} connus du front) — cet
            indicateur agrège côté serveur et ne semble pas exclure les sites désactivés. Signalé
            comme point à corriger côté backend ; les chiffres ci-dessous ne sont pas recalculés
            côté client.
          </span>
        </p>
      ) : null}

      {kpiEnErreur ? (
        <p className={styles.classementErreur}>
          {kpiErreur instanceof HttpError ? kpiErreur.message : 'Indicateurs indisponibles.'}
        </p>
      ) : chargementKpi ? (
        <SkeletonBandeStats colonnes={5} />
      ) : kpi ? (
        <div className={styles.envCard}>
          <div className={styles.envKpiGrid}>
            <EnvKpi icon={<MapPin size={18} />} label="Sites"
              value={kpi.totalSites.toLocaleString('fr-FR')} sub="sites du référentiel" tone="neutral" />
            <EnvKpi icon={<Navigation size={18} />} label="Géolocalisés"
              value={`${kpi.sitesGeolocalises} / ${kpi.totalSites}`}
              sub="sites avec coordonnées GPS" tone="neutral"
              progress={kpi.totalSites > 0 ? (kpi.sitesGeolocalises / kpi.totalSites) * 100 : 0} />
            <EnvKpi icon={<UsersRound size={18} />} label="Effectif"
              value={kpi.effectifTotal.toLocaleString('fr-FR')}
              sub={`${kpi.effectifFemmes.toLocaleString('fr-FR')} femmes · ${kpi.effectifHommes.toLocaleString('fr-FR')} hommes`}
              tone="neutral" />
            <EnvKpi icon={<CalendarCheck size={18} />} label="Visites"
              value={kpi.nombreVisites.toLocaleString('fr-FR')} sub="sur la période sélectionnée" tone="neutral" />
            <EnvKpi icon={<ShieldCheck size={18} />} label="Formation EPI"
              value={`${kpi.tauxFormationEpi.toFixed(1)} %`} sub="sites formés à l’utilisation des EPI" tone="neutral" />
          </div>
        </div>
      ) : null}

      <EvolutionChart
        titre="Évolution des visites"
        sousTitre="Nombre de visites de site enregistrées par mois"
        donnees={evolution.data}
        isLoading={evolution.isLoading}
        isError={evolution.isError}
        erreur={evolution.error}
      />

      <div className={styles.envRow} style={{ gridTemplateColumns: '1fr 1fr' }}>
        <RepartitionBarres
          titre="Répartition par région"
          sousTitre="Nombre de sites par région"
          donnees={region.data}
          unite="sites"
          isLoading={region.isLoading}
          isError={region.isError}
          erreur={region.error}
        />
        <RepartitionBarres
          titre="Répartition par type de site"
          sousTitre="Nombre de sites par type de teinture pratiqué"
          donnees={type.data}
          unite="sites"
          isLoading={type.isLoading}
          isError={type.isError}
          erreur={type.error}
        />
      </div>

      <div className={styles.grilleClassements}>
        <ClassementCard titre="EPI" sousTitre="Sites déclarant au moins un équipement de protection"
          donnees={epi.data} total={kpi?.totalSites ?? 0} unite="sites"
          isLoading={epi.isLoading} isError={epi.isError} erreur={epi.error} />
        <ClassementCard titre="Risques" sousTitre="Sites signalant ce risque de sécurité"
          donnees={risques.data} total={kpi?.totalSites ?? 0} unite="sites"
          isLoading={risques.isLoading} isError={risques.isError} erreur={risques.error} />
        <ClassementCard titre="Besoins" sousTitre="Sites exprimant ce besoin prioritaire"
          donnees={besoins.data} total={kpi?.totalSites ?? 0} unite="sites"
          isLoading={besoins.isLoading} isError={besoins.isError} erreur={besoins.error} />
        <ClassementCard titre="Formations" sousTitre="Sites ayant reçu cette formation"
          donnees={formations.data} total={kpi?.totalSites ?? 0} unite="sites"
          isLoading={formations.isLoading} isError={formations.isError} erreur={formations.error} />
        <ClassementCard titre="Appuis" sousTitre="Sites ayant reçu cet appui"
          donnees={appuis.data} total={kpi?.totalSites ?? 0} unite="sites"
          isLoading={appuis.isLoading} isError={appuis.isError} erreur={appuis.error} />
        <ClassementCard titre="Teintures" sousTitre="Sites pratiquant ce type de teinture"
          donnees={teintures.data} total={kpi?.totalSites ?? 0} unite="sites"
          isLoading={teintures.isLoading} isError={teintures.isError} erreur={teintures.error} />
        <ClassementCard titre="Équipements" sousTitre="Sites disposant de cet équipement"
          donnees={equipements.data} total={kpi?.totalSites ?? 0} unite="sites"
          isLoading={equipements.isLoading} isError={equipements.isError} erreur={equipements.error} />
      </div>
    </div>
  );
}
