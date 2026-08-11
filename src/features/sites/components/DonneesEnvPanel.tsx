import { Leaf, Droplet, Wind, Trash2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Skeleton, EmptyState } from '@/components/common';
import { useDonneesEnvironnementales } from '../hooks/useSites';
import type { DonneeEnvironnementale } from '../api/donneesEnv';
import { EnvPhotoGallery } from './EnvPhotoGallery';
import styles from './DonneesEnvPanel.module.css';

/* ─── Formatage numérique ─── */
function fmt(v: string | null | undefined, unit = ''): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v + (unit ? ' ' + unit : '');
  const display = n % 1 === 0 ? String(n) : n.toFixed(2);
  return unit ? `${display} ${unit}` : display;
}

function humanize(v: string | null | undefined): string {
  if (!v) return '—';
  return v.replace(/_/g, ' ');
}

/* ─── Badges ─── */
function ConformBadge({ val }: { val: string | null | undefined }) {
  if (!val) return <span className={styles.metricEmpty}>—</span>;
  const lower = val.toLowerCase().replace(/[-\s]/g, '_');
  if (lower === 'conforme' || lower === 'oui') {
    return (
      <span className={`${styles.confBadge} ${styles.confOk}`}>
        <CheckCircle2 size={11} /> Conforme
      </span>
    );
  }
  if (lower.includes('non') || lower === 'non_conforme') {
    return (
      <span className={`${styles.confBadge} ${styles.confNo}`}>
        <XCircle size={11} /> Non conforme
      </span>
    );
  }
  return (
    <span className={`${styles.confBadge} ${styles.confWarn}`}>
      <AlertTriangle size={11} /> {humanize(val)}
    </span>
  );
}

function OuiNon({ val }: { val: boolean | null | undefined }) {
  if (val == null) return <span className={styles.metricEmpty}>—</span>;
  return (
    <span className={`${styles.ouiNon} ${val ? styles.ouiNonOui : styles.ouiNonNon}`}>
      {val ? 'Oui' : 'Non'}
    </span>
  );
}

/* ─── Structure section ─── */
function EnvSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionIcon}>{icon}</span>
        <h3 className={styles.sectionTitle}>{title}</h3>
      </div>
      <div className={styles.sectionGrid}>{children}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  const isEmpty = value == null || value === '' || value === '—';
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={isEmpty ? styles.metricEmpty : mono ? styles.metricValue : styles.metricValueText}>
        {isEmpty ? '—' : value}
      </span>
    </div>
  );
}

/* ─── Panel principal ─── */
export function DonneesEnvPanel({ siteId }: { siteId: string }) {
  const { data, isLoading } = useDonneesEnvironnementales(siteId);

  if (isLoading) {
    return (
      <div className={styles.stack}>
        <Skeleton height={96} radius={12} />
        <Skeleton height={220} radius={12} />
        <Skeleton height={180} radius={12} />
      </div>
    );
  }

  const d: DonneeEnvironnementale | null = data?.resultats?.[0] ?? null;

  if (!d) {
    return (
      <EmptyState
        icon={<Leaf size={24} />}
        title="Pas encore de données environnementales"
        description="Les mesures collectées via Kobo pour ce site n'ont pas encore été importées."
      />
    );
  }

  const hasConformite = d.conformiteGlobale || d.niveauRisqueGlobal;
  const hasSol = d.phSol || d.ceSol || d.ferSol || d.chromeSol || d.zincSol || d.conformiteSol;
  const hasAir = d.pm25 || d.pm10 || d.coAir || d.no2Air || d.so2Air || d.covAir;

  return (
    <div className={styles.panel}>
      {/* ── Conformité globale ── */}
      {hasConformite ? (
        <div className={styles.conformiteBar}>
          <div className={styles.conformiteRow}>
            <span className={styles.conformiteLabel}>Conformité globale</span>
            <ConformBadge val={d.conformiteGlobale} />
          </div>
          {d.niveauRisqueGlobal ? (
            <div className={styles.conformiteRow}>
              <span className={styles.conformiteLabel}>Niveau de risque</span>
              <span
                className={styles.riskBadge}
                data-risk={d.niveauRisqueGlobal.toLowerCase().replace(/\s/g, '_')}
              >
                {humanize(d.niveauRisqueGlobal)}
              </span>
            </div>
          ) : null}
          {(d.conformiteSyntheseEau || d.conformiteSyntheseSol || d.conformiteSyntheseAir || d.conformiteSyntheseDechets) ? (
            <div className={styles.syntheseRow}>
              {d.conformiteSyntheseEau ? (
                <div className={styles.synthItem}>
                  <Droplet size={12} />
                  <span>Eau</span>
                  <ConformBadge val={d.conformiteSyntheseEau} />
                </div>
              ) : null}
              {d.conformiteSyntheseSol ? (
                <div className={styles.synthItem}>
                  <span>Sol</span>
                  <ConformBadge val={d.conformiteSyntheseSol} />
                </div>
              ) : null}
              {d.conformiteSyntheseAir ? (
                <div className={styles.synthItem}>
                  <Wind size={12} />
                  <span>Air</span>
                  <ConformBadge val={d.conformiteSyntheseAir} />
                </div>
              ) : null}
              {d.conformiteSyntheseDechets ? (
                <div className={styles.synthItem}>
                  <Trash2 size={12} />
                  <span>Déchets</span>
                  <ConformBadge val={d.conformiteSyntheseDechets} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.grid}>
        {/* ── Eau in situ ── */}
        <EnvSection title="Eau — mesures in situ" icon={<Droplet size={14} />}>
          <Metric label="Température" value={fmt(d.temperatureEau, '°C')} />
          <Metric label="pH" value={fmt(d.phEau)} />
          <Metric label="Conductivité" value={fmt(d.conductiviteEau, 'µS/cm')} />
          <Metric label="Turbidité" value={fmt(d.turbiditeEau, 'NTU')} />
          <Metric label="TDS" value={fmt(d.tdsEau, 'mg/L')} />
          {d.pointPrelevement ? (
            <Metric label="Point de prélèvement" value={humanize(d.pointPrelevement)} mono={false} />
          ) : null}
        </EnvSection>

        {/* ── Eau laboratoire ── */}
        <EnvSection title="Eau — analyses labo" icon={<Droplet size={14} />}>
          <Metric label="MES" value={fmt(d.mesEau, 'mg/L')} />
          <Metric label="DBO₅" value={fmt(d.dbo5Eau, 'mg/L')} />
          <Metric label="DCO" value={fmt(d.dcoEau, 'mg/L')} />
          <Metric label="Sulfates" value={fmt(d.sulfatesEau, 'mg/L')} />
          <Metric label="NH₄" value={fmt(d.nh4Eau, 'mg/L')} />
        </EnvSection>

        {/* ── Gestion de l'eau ── */}
        <EnvSection title="Gestion de l'eau" icon={<Droplet size={14} />}>
          <Metric label="Puisard existant" value={<OuiNon val={d.puisardExistant} />} mono={false} />
          {d.puisardExistant ? (
            <>
              <Metric label="Volume" value={fmt(d.volumePuisardM3, 'm³')} />
              <Metric label="État" value={humanize(d.etatPuisard)} mono={false} />
              <Metric label="Fréquence vidange" value={humanize(d.frequenceVidange)} mono={false} />
            </>
          ) : null}
          <Metric label="Système de traitement" value={<OuiNon val={d.systemeTraitementExistant} />} mono={false} />
          {d.modeEvacuation ? (
            <Metric label="Mode d'évacuation" value={humanize(d.modeEvacuation)} mono={false} />
          ) : null}
          {d.observationsGestionEau ? (
            <Metric label="Observations" value={d.observationsGestionEau} mono={false} />
          ) : null}
        </EnvSection>

        {/* ── Sol ── */}
        {hasSol ? (
          <EnvSection title="Sol" icon={<Leaf size={14} />}>
            <Metric label="pH sol" value={fmt(d.phSol)} />
            <Metric label="Conductivité élec." value={fmt(d.ceSol, 'µS/cm')} />
            <Metric label="Fer" value={fmt(d.ferSol, 'mg/kg')} />
            <Metric label="Chrome" value={fmt(d.chromeSol, 'mg/kg')} />
            <Metric label="Zinc" value={fmt(d.zincSol, 'mg/kg')} />
            <Metric label="Conformité" value={<ConformBadge val={d.conformiteSol} />} mono={false} />
          </EnvSection>
        ) : null}

        {/* ── Air ambiant ── */}
        {hasAir ? (
          <EnvSection title="Air ambiant" icon={<Wind size={14} />}>
            <Metric label="PM2.5" value={fmt(d.pm25, 'µg/m³')} />
            <Metric label="PM10" value={fmt(d.pm10, 'µg/m³')} />
            <Metric label="CO" value={fmt(d.coAir, 'ppm')} />
            <Metric label="NO₂" value={fmt(d.no2Air, 'µg/m³')} />
            <Metric label="SO₂" value={fmt(d.so2Air, 'µg/m³')} />
            <Metric label="COV" value={fmt(d.covAir, 'ppm')} />
            {d.pointMesureAir ? (
              <Metric label="Point de mesure" value={humanize(d.pointMesureAir)} mono={false} />
            ) : null}
          </EnvSection>
        ) : null}

        {/* ── Déchets ── */}
        {d.conformiteDechets ? (
          <EnvSection title="Déchets" icon={<Trash2 size={14} />}>
            <Metric label="Conformité" value={<ConformBadge val={d.conformiteDechets} />} mono={false} />
          </EnvSection>
        ) : null}
      </div>

      {/* ── Galerie photos ── */}
      <EnvPhotoGallery medias={d.medias} />
    </div>
  );
}
