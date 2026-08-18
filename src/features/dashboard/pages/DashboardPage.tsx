import { useMemo, useState, type ReactNode } from 'react';
import {
  Clock,
  Download,
  Eye,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { Button, EmptyState, Select, Skeleton } from '@/components/common';
import { exportRowsToXlsx } from '@/lib/xlsxExport';
import { useSites } from '@/features/sites/hooks/useSites';
import { ConformiteSitePanel } from '@/features/sites/components/ConformiteSitePanel';
import {
  useConformiteDetails,
  useConformiteGlobale,
  useConformiteSite,
} from '@/features/conformite/hooks/useConformite';
import type {
  ConformiteGlobale,
  ConformiteSiteDetail,
  ConformiteSiteSummary,
  StatutConformite,
} from '@/features/conformite/api/conformite';
import styles from './DashboardPage.module.css';

const RISQUE_LABEL: Record<string, string> = {
  FAIBLE: 'Faible', MODERE: 'Modéré', ELEVE: 'Élevé', CRITIQUE: 'Critique',
};
const RISQUE_TEXT: Record<string, string> = {
  FAIBLE: 'Risque maîtrisé',
  MODERE: 'Surveillance renforcée',
  ELEVE: 'Action corrective requise',
  CRITIQUE: 'Intervention urgente',
};
const STATUT_SHORT: Record<string, string> = {
  CONFORME: 'Conforme',
  A_SURVEILLER: 'À surveiller',
  CRITIQUE: 'Critique',
  NON_CONFORME: 'Non conforme',
  NON_EVALUE: '—',
};
const COMP_LABEL: Record<string, string> = { AIR: 'AIR', EAU: 'EAU', SOL: 'SOL' };
const COMP_ORDER = ['AIR', 'EAU', 'SOL'];

/* ═══════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════ */

export function DashboardPage() {
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const filterSiteId = siteFilter === 'all' ? null : siteFilter;

  const { data: sitesPage } = useSites();
  const allSites = useMemo(() => sitesPage?.items ?? [], [sitesPage]);

  const { data: conformiteGlobale, isLoading: loadingGlobale } = useConformiteGlobale();
  const { data: conformiteSite, isLoading: loadingSite } = useConformiteSite(filterSiteId ?? undefined);

  const confSiteIds = useMemo(
    () => (conformiteGlobale?.sites ?? []).map((s) => String(s.id)),
    [conformiteGlobale],
  );
  const detailQueries = useConformiteDetails(filterSiteId ? [] : confSiteIds);
  const loadingParams = !filterSiteId && detailQueries.some((q) => q.isLoading);
  const paramsHorsNorme = aggregateParametresHorsNorme(detailQueries.map((q) => q.data));

  const siteNameById = useMemo(() => {
    const map = new Map<string, string>();
    allSites.forEach((s) => map.set(s.id, s.shortName));
    return map;
  }, [allSites]);

  const locBySiteId = useMemo(() => {
    const map = new Map<number, string>();
    allSites.forEach((s) => {
      map.set(Number(s.id), [s.location.commune, s.location.city].filter(Boolean).join(', '));
    });
    return map;
  }, [allSites]);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const selectedSiteName = filterSiteId ? (siteNameById.get(filterSiteId) ?? null) : null;
  const siteOptions = [
    { value: 'all', label: 'Tous les sites' },
    ...allSites.map((s) => ({ value: s.id, label: s.shortName })),
  ];

  const handleExport = () => {
    if (filterSiteId && conformiteSite) {
      const rows = conformiteSite.composantes.flatMap((c) =>
        c.parametres.map((p) => ({ composante: c.code, ...p })),
      );
      exportRowsToXlsx({
        filename: `conformite_${selectedSiteName ?? filterSiteId}`,
        sheetName: 'Conformité',
        columns: [
          { header: 'Composante', accessor: (r) => COMP_LABEL[r.composante] ?? r.composante },
          { header: 'Paramètre', accessor: (r) => r.libelle },
          { header: 'Valeur', accessor: (r) => r.valeurBrute },
          { header: 'Unité', accessor: (r) => r.unite ?? '' },
          { header: 'Statut', accessor: (r) => STATUT_SHORT[r.statut] ?? r.statut },
          { header: 'Seuil min', accessor: (r) => r.seuil?.valeurMin ?? '' },
          { header: 'Seuil max', accessor: (r) => r.seuil?.valeurMax ?? '' },
        ],
        rows,
      });
    } else if (conformiteGlobale) {
      exportRowsToXlsx({
        filename: 'conformite_sites',
        sheetName: 'Conformité',
        columns: [
          { header: 'Site', accessor: (s) => s.nom },
          { header: 'Localisation', accessor: (s) => locBySiteId.get(s.id) ?? '' },
          { header: 'Global', accessor: (s) => STATUT_SHORT[s.statut] ?? s.statut },
          ...COMP_ORDER.map((code) => ({
            header: code,
            accessor: (s: ConformiteSiteSummary) =>
              s.composantes[code] ? (STATUT_SHORT[s.composantes[code]!] ?? s.composantes[code]) : '—',
          })),
        ],
        rows: conformiteGlobale.sites,
      });
    }
  };

  const exportDisabled = filterSiteId ? !conformiteSite : !conformiteGlobale?.sites.length;

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-page-header>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>{allSites.length} sites suivis · {today}</span>
          <h1 className={styles.heroTitle}>Tableau de bord environnemental</h1>
          <p className={styles.heroDescription}>
            Suivi de la conformité environnementale des sites de teinture.
          </p>
        </div>
        <div className={styles.heroControls}>
          <Select<string>
            value={siteFilter}
            onChange={setSiteFilter}
            options={siteOptions}
            aria-label="Filtrer par site"
          />
          <Button variant="secondary" iconLeft={<Download size={14} />} onClick={handleExport} disabled={exportDisabled}>
            Exporter
          </Button>
        </div>
      </header>

      {filterSiteId ? (
        <SiteEnvSection
          siteId={filterSiteId}
          siteName={selectedSiteName}
          data={conformiteSite}
          isLoading={loadingSite}
        />
      ) : (
        <GlobalEnvSection
          data={conformiteGlobale}
          isLoading={loadingGlobale}
          locBySiteId={locBySiteId}
          paramsHorsNorme={paramsHorsNorme}
          loadingParams={loadingParams}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Vue agrégée — tous les sites (conformité labo)
═══════════════════════════════════════════════════════════ */

interface ComposanteAgg {
  code: string;
  conformes: number;
  surveiller: number;
  critiques: number;
  total: number;
  statut: StatutConformite;
  tauxDominant: number;
}

function computeComposantes(sites: ConformiteSiteSummary[]): ComposanteAgg[] {
  const codes = Array.from(new Set(sites.flatMap((s) => Object.keys(s.composantes))));
  return codes
    .map((code) => {
      const rel = sites.filter((s) => code in s.composantes);
      const total = rel.length;
      const conformes = rel.filter((s) => s.composantes[code] === 'CONFORME').length;
      const surveiller = rel.filter((s) => s.composantes[code] === 'A_SURVEILLER').length;
      const critiques = rel.filter((s) => s.composantes[code] === 'CRITIQUE').length;
      const statut: StatutConformite =
        critiques > 0 ? 'CRITIQUE' : surveiller > conformes ? 'A_SURVEILLER' : 'CONFORME';
      const dominant =
        statut === 'CRITIQUE' ? critiques : statut === 'A_SURVEILLER' ? surveiller : conformes;
      return { code, conformes, surveiller, critiques, total, statut, tauxDominant: total > 0 ? (dominant / total) * 100 : 0 };
    })
    .sort((a, b) => COMP_ORDER.indexOf(a.code) - COMP_ORDER.indexOf(b.code));
}

interface ParametreHorsNorme {
  key: string;
  libelle: string;
  unite: string | null;
  exempleValeur: string;
  seuilTxt: string;
  sitesCount: number;
  siteNames: string[];
}

function aggregateParametresHorsNorme(
  details: Array<ConformiteSiteDetail | undefined>,
): ParametreHorsNorme[] {
  const map = new Map<string, ParametreHorsNorme>();
  for (const d of details) {
    if (!d) continue;
    for (const comp of d.composantes) {
      for (const p of comp.parametres) {
        if (p.statut !== 'NON_CONFORME' && p.statut !== 'CRITIQUE') continue;
        const key = p.code || p.libelle;
        const seuilTxt = p.seuil
          ? `${p.seuil.valeurMin ?? '—'}–${p.seuil.valeurMax ?? '—'} ${p.seuil.unite ?? ''}`.trim()
          : '—';
        const existing = map.get(key);
        if (existing) {
          existing.sitesCount += 1;
          existing.siteNames.push(d.site.nom);
        } else {
          map.set(key, {
            key,
            libelle: p.libelle || p.code,
            unite: p.unite,
            exempleValeur: `${p.valeurBrute}${p.unite ? ` ${p.unite}` : ''}`,
            seuilTxt,
            sitesCount: 1,
            siteNames: [d.site.nom],
          });
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.sitesCount - a.sitesCount);
}

function StatutPill({ statut }: { statut: string }) {
  const cls =
    statut === 'CONFORME' ? styles.pillOk
    : statut === 'CRITIQUE' || statut === 'NON_CONFORME' ? styles.pillCrit
    : statut === 'A_SURVEILLER' ? styles.pillWarn
    : styles.pillNd;
  return <span className={`${styles.envPill} ${cls}`}>{STATUT_SHORT[statut] ?? statut}</span>;
}

function DonutChart({ conformes, surveiller, critiques, total }: {
  conformes: number; surveiller: number; critiques: number; total: number;
}) {
  const SIZE = 190; const C = SIZE / 2; const R = 68; const SW = 26;
  const circ = 2 * Math.PI * R;
  const segs = [
    { n: critiques, color: 'var(--color-danger)' },
    { n: surveiller, color: 'var(--color-amber)' },
    { n: conformes, color: 'var(--color-success)' },
  ].filter((s) => s.n > 0 && total > 0);
  let cum = 0;
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" className={styles.donutSvg}>
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-border)" strokeWidth={SW} />
      {segs.map((seg, i) => {
        const dash = (seg.n / total) * circ;
        const offset = circ * 0.25 - cum;
        cum += dash;
        return (
          <circle key={i} cx={C} cy={C} r={R} fill="none" stroke={seg.color} strokeWidth={SW}
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={offset} />
        );
      })}
      <text x={C} y={C - 6} textAnchor="middle" className={styles.donutBig}>{total}</text>
      <text x={C} y={C + 13} textAnchor="middle" className={styles.donutSub}>Sites suivis</text>
    </svg>
  );
}

function EnvKpi({ icon, label, value, sub, tone, progress }: {
  icon: ReactNode; label: string; value: string; sub: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger'; progress?: number;
}) {
  return (
    <div className={styles.envKpi} data-tone={tone}>
      <header className={styles.envKpiTop}>
        <span className={styles.envKpiIcon} data-tone={tone}>{icon}</span>
        <span className={styles.envKpiLabel}>{label}</span>
      </header>
      <span className={styles.envKpiValue}>{value}</span>
      <span className={styles.envKpiSub}>{sub}</span>
      {progress !== undefined ? (
        <div className={styles.envKpiTrack}>
          <div className={styles.envKpiBar} data-tone={tone} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      ) : null}
    </div>
  );
}

interface GlobalEnvSectionProps {
  data: ConformiteGlobale | undefined;
  isLoading: boolean;
  locBySiteId: Map<number, string>;
  paramsHorsNorme: ParametreHorsNorme[];
  loadingParams: boolean;
}

function GlobalEnvSection({ data, isLoading, locBySiteId, paramsHorsNorme, loadingParams }: GlobalEnvSectionProps) {
  if (isLoading) {
    return (
      <div className={styles.envCard}>
        <div style={{ padding: 'var(--space-5)' }}><Skeleton height={400} /></div>
      </div>
    );
  }
  if (!data || data.sites.length === 0) {
    return (
      <div className={styles.envCard}>
        <EmptyState
          icon={<ShieldCheck size={24} />}
          title="Aucune donnée de conformité"
          description="Aucun résultat d'analyse laboratoire n'est encore disponible pour les sites suivis."
        />
      </div>
    );
  }

  const { resume, sites } = data;
  const composantes = computeComposantes(sites);
  const total = resume.nombreSites;

  const risqueTone =
    resume.niveauRisqueGlobal === 'FAIBLE' ? 'success'
    : resume.niveauRisqueGlobal === 'MODERE' ? 'warning'
    : 'danger';

  const pct = (n: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)} %` : '0 %');

  return (
    <section className={styles.envGroup} aria-label="Conformité environnementale — tous les sites">
      <div className={styles.envCard}>
        <header className={styles.envHead}>
          <div>
            <h2 className={styles.envTitle}>Conformité environnementale</h2>
            <p className={styles.envMeta}>État actuel — résultats d'analyses laboratoire, tous sites confondus</p>
          </div>
          <span className={`${styles.risqueBadge} ${styles[`risque_${risqueTone}`]}`}>
            Risque {RISQUE_LABEL[resume.niveauRisqueGlobal] ?? resume.niveauRisqueGlobal}
          </span>
        </header>

        <div className={styles.envKpiGrid}>
          <EnvKpi icon={<ShieldCheck size={18} />} label="Taux de conformité global"
            value={`${resume.tauxConformiteGlobal.toFixed(1)} %`} sub="Objectif : ≥ 85 %"
            tone={resume.tauxConformiteGlobal >= 85 ? 'success' : resume.tauxConformiteGlobal >= 60 ? 'warning' : 'danger'}
            progress={resume.tauxConformiteGlobal} />
          <EnvKpi icon={<ShieldAlert size={18} />} label="Sites critiques"
            value={String(resume.sitesCritiques)} sub={`${pct(resume.sitesCritiques)} des sites`}
            tone={resume.sitesCritiques > 0 ? 'danger' : 'success'} />
          <EnvKpi icon={<Eye size={18} />} label="Sites à surveiller"
            value={String(resume.sitesASurveiller)} sub={`${pct(resume.sitesASurveiller)} des sites`}
            tone={resume.sitesASurveiller > 0 ? 'warning' : 'success'} />
          <EnvKpi icon={<Gauge size={18} />} label="Niveau de risque global"
            value={RISQUE_LABEL[resume.niveauRisqueGlobal] ?? resume.niveauRisqueGlobal}
            sub={RISQUE_TEXT[resume.niveauRisqueGlobal] ?? ''} tone={risqueTone} />
          <EnvKpi icon={<UsersRound size={18} />} label="Sites suivis"
            value={String(resume.nombreSites)} sub="Résultats labo disponibles" tone="neutral" />
        </div>
      </div>

      <div className={styles.envRow}>
        <div className={`${styles.envCard} ${styles.envComposanteCol}`}>
          <h3 className={styles.envSubTitle}>Conformité par composante</h3>
          <div className={styles.envCompGrid}>
            {composantes.map((c) => (
              <div key={c.code} className={styles.envCompTile}>
                <div className={styles.envCompHead}>
                  <span className={styles.envCompCode}>{COMP_LABEL[c.code] ?? c.code}</span>
                  <StatutPill statut={c.statut} />
                </div>
                <span className={styles.envCompTaux}>{c.tauxDominant.toFixed(1)} %</span>
                <div className={styles.envCompTrack}>
                  <div className={styles.envCompFill}
                    style={{ width: `${Math.min(100, c.tauxDominant)}%` }} />
                </div>
                <div className={styles.envCompCounters}>
                  <span className={styles.ccConf}>{c.conformes} conformes</span>
                  <span className={styles.ccDot}>·</span>
                  <span className={styles.ccWarn}>{c.surveiller} à surveiller</span>
                  <span className={styles.ccDot}>·</span>
                  <span className={styles.ccCrit}>{c.critiques} critiques</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.envCard} ${styles.envDonutCol}`}>
          <h3 className={styles.envSubTitle}>Répartition des sites par statut</h3>
          <div className={styles.envDonutInner}>
            <DonutChart conformes={resume.sitesConformes} surveiller={resume.sitesASurveiller}
              critiques={resume.sitesCritiques} total={total} />
            <ul className={styles.donutLegend}>
              <li className={styles.donutLegendRow}>
                <span className={styles.ldCrit} aria-hidden="true" />
                <span className={styles.ldLabel}>Critiques</span>
                <span className={styles.ldCount}>{resume.sitesCritiques} ({pct(resume.sitesCritiques)})</span>
              </li>
              <li className={styles.donutLegendRow}>
                <span className={styles.ldWarn} aria-hidden="true" />
                <span className={styles.ldLabel}>À surveiller</span>
                <span className={styles.ldCount}>{resume.sitesASurveiller} ({pct(resume.sitesASurveiller)})</span>
              </li>
              <li className={styles.donutLegendRow}>
                <span className={styles.ldOk} aria-hidden="true" />
                <span className={styles.ldLabel}>Conformes</span>
                <span className={styles.ldCount}>{resume.sitesConformes} ({pct(resume.sitesConformes)})</span>
              </li>
            </ul>
          </div>
          <p className={styles.donutTimestamp}><Clock size={11} />Snapshot labo — non daté par période</p>
        </div>
      </div>

      <div className={styles.envRow}>
        <div className={`${styles.envCard} ${styles.envTableWrap}`}>
          <header className={styles.envTableHead}>
            <h3 className={styles.envSubTitle}>Conformité par site</h3>
            <span className={styles.envTableCount}>{sites.length} site{sites.length > 1 ? 's' : ''}</span>
          </header>
          <div className={styles.envTableScroll}>
            <table className={styles.envTable}>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Localisation</th>
                  <th>Global</th>
                  {composantes.map((c) => <th key={c.code}>{c.code}</th>)}
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.id}>
                    <td className={styles.envTdSite}>{s.nom}</td>
                    <td className={styles.envTdLoc}>{locBySiteId.get(s.id) ?? '—'}</td>
                    <td><StatutPill statut={s.statut} /></td>
                    {composantes.map((c) => (
                      <td key={c.code}>
                        {s.composantes[c.code]
                          ? <StatutPill statut={s.composantes[c.code] as StatutConformite} />
                          : <span className={styles.envTdNd}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${styles.envCard} ${styles.paramPanel}`}>
          <header className={styles.paramPanelHead}>
            <h3 className={styles.envSubTitle}>Paramètres hors norme</h3>
          </header>
          {loadingParams ? (
            <div style={{ padding: 'var(--space-4)' }}><Skeleton height={220} /></div>
          ) : paramsHorsNorme.length === 0 ? (
            <p className={styles.empty}>Aucun paramètre hors norme actuellement.</p>
          ) : (
            <ul className={styles.paramList}>
              {paramsHorsNorme.slice(0, 6).map((p) => (
                <li key={p.key} className={styles.paramRow}>
                  <div className={styles.paramContent}>
                    <span className={styles.paramName}>{p.libelle}</span>
                    <span className={styles.paramMeta}>ex. {p.exempleValeur} · seuil {p.seuilTxt}</span>
                  </div>
                  <span className={styles.paramCount}>
                    {p.sitesCount} site{p.sitesCount > 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {paramsHorsNorme.length > 6 ? (
            <p className={styles.paramFoot}>+ {paramsHorsNorme.length - 6} autre{paramsHorsNorme.length - 6 > 1 ? 's' : ''} paramètre{paramsHorsNorme.length - 6 > 1 ? 's' : ''} hors norme</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   Vue détaillée — un seul site sélectionné
═══════════════════════════════════════════════════════════ */

interface SiteEnvSectionProps {
  siteId: string;
  siteName: string | null;
  data: ConformiteSiteDetail | undefined;
  isLoading: boolean;
}

function SiteEnvSection({ siteId, siteName, data, isLoading }: SiteEnvSectionProps) {
  const risqueTone =
    data?.resume.niveauRisque === 'FAIBLE' ? 'success'
    : data?.resume.niveauRisque === 'MODERE' ? 'warning'
    : data ? 'danger' : undefined;

  return (
    <section className={styles.envGroup} aria-label={`Conformité environnementale — ${siteName ?? siteId}`}>
      <header className={styles.envPlainHead}>
        <div>
          <h2 className={styles.envTitle}>Conformité environnementale — {siteName ?? '…'}</h2>
          <p className={styles.envMeta}>État actuel — résultats d'analyses laboratoire pour ce site</p>
        </div>
        {risqueTone ? (
          <span className={`${styles.risqueBadge} ${styles[`risque_${risqueTone}`]}`}>
            Risque {RISQUE_LABEL[data!.resume.niveauRisque] ?? data!.resume.niveauRisque}
          </span>
        ) : null}
      </header>
      {isLoading ? (
        <div className={styles.envCard}>
          <div style={{ padding: 'var(--space-5)' }}><Skeleton height={360} /></div>
        </div>
      ) : (
        <ConformiteSitePanel siteId={siteId} />
      )}
    </section>
  );
}
