import { Bar, Doughnut } from 'react-chartjs-2';
import type { ReactNode } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import type {
  DomainConformity,
  ReportAggregate,
  TopExceedance,
} from '../lib/aggregator';
import {
  baselineComparison,
  domainNarrative,
  exceedancesIntro,
  executiveSummary,
  recommendations,
  type NarrativeSentence,
} from '../lib/narrativeRules';
import type { ReportTemplate } from '../lib/reportSpec';
import styles from './ReportPreview.module.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

interface ReportPreviewProps {
  template: ReportTemplate;
  aggregate: ReportAggregate;
  /** Nom court du site quand mono-site. */
  siteShortName?: string;
  /** Nom complet du superviseur/auteur affiché en couverture. */
  generatedByName?: string;
  /** Index de la page à afficher à l'écran (les autres restent en DOM pour le PDF). */
  activePageIndex?: number;
}

const DOMAIN_LABEL: Record<string, string> = {
  water: 'Eaux usées',
  soil: 'Sol',
  air: 'Air',
  waste: 'Déchets',
  health: 'Santé / SST',
  socio: 'Socio-éco',
};

const SECTION_NUMBER: Record<string, string> = {
  executive: '01',
  kpis: '02',
  domains: '03',
  exceedances: '04',
  alerts: '05',
  lab: '06',
  silences: '07',
  baseline: '08',
  recommendations: '09',
  legal: '10',
  appendix: 'A',
};

const SECTION_TITLE: Record<string, string> = {
  executive: 'Synthèse exécutive',
  kpis: 'Indicateurs clés',
  domains: 'Conformité par domaine',
  exceedances: 'Dépassements de seuils',
  alerts: 'Alertes & dépassements',
  lab: 'Suivi laboratoire',
  silences: 'Présence terrain',
  baseline: 'Comparaison aux valeurs de référence (Diagnostic 2025)',
  recommendations: 'Recommandations',
  legal: 'Cadre réglementaire applicable',
  appendix: 'Annexe — Collectes incluses',
};

export function ReportPreview({
  template,
  aggregate,
  siteShortName,
  generatedByName,
  activePageIndex,
}: ReportPreviewProps) {
  const ordered = template.sections;
  const totalPages = ordered.length;

  const sectionBody: Record<string, () => JSX.Element> = {
    executive: () => <ExecutiveBody aggregate={aggregate} />,
    kpis: () => <KpiBody aggregate={aggregate} />,
    domains: () => <DomainBody aggregate={aggregate} />,
    exceedances: () => <ExceedancesBody aggregate={aggregate} />,
    alerts: () => <AlertsBody aggregate={aggregate} />,
    lab: () => <LabBody aggregate={aggregate} />,
    silences: () => <SilencesBody aggregate={aggregate} />,
    baseline: () => <BaselineBody aggregate={aggregate} />,
    recommendations: () => <RecommendationsBody aggregate={aggregate} />,
    legal: () => <LegalBody />,
    appendix: () => <AppendixBody aggregate={aggregate} />,
  };

  return (
    <article id="report-print-root" className={styles.report}>
      {ordered.map((id, i) => {
        const isActive = activePageIndex === undefined || activePageIndex === i;
        const isCover = id === 'cover';
        return (
          <div
            key={id}
            className={styles.pageWrap}
            data-page-index={i}
            data-active={isActive ? 'true' : 'false'}
          >
            {isCover ? (
              <CoverPage
                template={template}
                aggregate={aggregate}
                siteShortName={siteShortName}
                generatedByName={generatedByName}
              />
            ) : (
              <SectionPage
                pageNum={i + 1}
                totalPages={totalPages}
                periodLabel={aggregate.period.label}
                templateTitle={template.title}
                scopeLabel={
                  aggregate.scope.siteId
                    ? `Mono-site · ${siteShortName ?? aggregate.scope.siteId}`
                    : `Multi-sites · ${aggregate.siteCount} ateliers`
                }
                number={SECTION_NUMBER[id] ?? '·'}
                title={SECTION_TITLE[id] ?? id}
              >
                {sectionBody[id]?.()}
              </SectionPage>
            )}
          </div>
        );
      })}
    </article>
  );
}

/* ─────────── Page wrapper avec running header + footer ─────────── */
function SectionPage({
  pageNum,
  totalPages,
  periodLabel,
  templateTitle,
  scopeLabel,
  number,
  title,
  children,
}: {
  pageNum: number;
  totalPages: number;
  periodLabel: string;
  templateTitle: string;
  scopeLabel: string;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.page}>
      <header className={styles.runningHeader}>
        <div className={styles.runningBrand}>
          <img src="/logos/logo_pnud.png" alt="PNUD" className={styles.runningLogo} />
          <div className={styles.runningInfo}>
            <span className={styles.runningTitle}>PASET Mali — {templateTitle}</span>
            <span className={styles.runningMeta}>{periodLabel} · {scopeLabel}</span>
          </div>
        </div>
        <span className={styles.runningCounter}>Page {pageNum} / {totalPages}</span>
      </header>

      <div className={styles.sectionHead}>
        <span className={styles.sectionNumber}>{number}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>

      <div className={styles.pageBody}>{children}</div>

      <footer className={styles.runningFooter}>
        <span>Document officiel · PASET Mali / PNUD Mali</span>
        <span>UNDP-MLI-00492 · Confidentiel</span>
      </footer>
    </section>
  );
}

/* ─────────── Cover ─────────── */
function CoverPage({
  template,
  aggregate,
  siteShortName,
  generatedByName,
}: {
  template: ReportTemplate;
  aggregate: ReportAggregate;
  siteShortName?: string;
  generatedByName?: string;
}) {
  return (
    <section className={`${styles.page} ${styles.coverPage}`}>
      <header className={styles.coverHeader}>
        <img src="/logos/logo_pnud.png" alt="PNUD" className={styles.coverLogo} />
        <span className={styles.coverEyebrow}>Document officiel</span>
      </header>

      <div className={styles.coverBrandBlock}>
        <span className={styles.coverWordmarkTop}>PASET</span>
        <span className={styles.coverWordmarkBottom}>MALI</span>
        <span className={styles.coverBrandTagline}>Suivi socio-environnemental des teintureries artisanales</span>
      </div>

      <div className={styles.coverHero}>
        <span className={styles.coverCadence}>{template.cadenceLabel.toUpperCase()}</span>
        <h1 className={styles.coverTitle}>{template.title}</h1>
        <p className={styles.coverSubtitle}>{aggregate.period.label}</p>
      </div>

      <div className={styles.coverMeta}>
        <MetaRow label="Période" value={`${formatLong(aggregate.period.from)} → ${formatLong(aggregate.period.to)}`} />
        <MetaRow
          label="Périmètre"
          value={
            aggregate.scope.siteId
              ? `Mono-site · ${siteShortName ?? aggregate.scope.siteId}`
              : `Multi-sites · ${aggregate.siteCount} ateliers pilotes`
          }
        />
        <MetaRow label="Audience" value={template.audience} />
        <MetaRow
          label="Généré le"
          value={`${formatLong(aggregate.generatedAt)}${generatedByName ? ` · par ${generatedByName}` : ''}`}
        />
        <MetaRow label="Référence appel d'offres" value="UNDP-MLI-00492" />
      </div>

      <footer className={styles.coverFooter}>
        <p>
          Document généré automatiquement par la plateforme à partir des données terrain
          validées. Les indicateurs et seuils s'appuient sur les Directives OMS, la Norme
          malienne MN-03-02/002:2006 et la Loi n°2021-032 du 24 mai 2021.
        </p>
        <p className={styles.coverConsortium}>
          PNUD Mali · Consortium Sahel Analytics & Sahel Environnement
        </p>
      </footer>
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

/* ─────────── Bodies (contenu seul, sans wrapper section) ─────────── */
function ExecutiveBody({ aggregate }: { aggregate: ReportAggregate }) {
  const sentences = executiveSummary(aggregate);
  return (
    <div className={styles.narrativeBlock}>
      {sentences.map((s) => (
        <NarrativeLine key={s.ruleId} sentence={s} />
      ))}
    </div>
  );
}

function NarrativeLine({ sentence }: { sentence: NarrativeSentence }) {
  return (
    <p className={`${styles.narrative} ${styles[`narrative_${sentence.tone}`]}`}>
      {sentence.text}
    </p>
  );
}

function KpiBody({ aggregate }: { aggregate: ReportAggregate }) {
  const v = aggregate.validation;
  const a = aggregate.alerts;
  const l = aggregate.lab;
  return (
    <div className={styles.kpiGrid}>
      <KpiCard label="Collectes soumises" value={String(v.total)} hint={`${v.validated} validées`} />
      <KpiCard label="Taux validation" value={`${v.validationRate}%`} hint="cible ≥ 80%" tone={v.validationRate >= 80 ? 'positive' : 'warning'} />
      <KpiCard
        label="Alertes critiques"
        value={String(a.critical)}
        hint={`${a.resolved} résolues`}
        tone={a.critical > 0 ? 'critical' : 'positive'}
      />
      <KpiCard
        label="Bordereaux labo"
        value={`${l.received}/${l.total}`}
        hint={l.medianTurnaroundDays != null ? `${l.medianTurnaroundDays.toFixed(1)} j médian` : 'pas de données'}
        tone={l.overdue > 0 ? 'warning' : 'neutral'}
      />
      <KpiCard
        label="Sites silencieux"
        value={String(aggregate.silences.length)}
        hint=">14 jours sans collecte"
        tone={aggregate.silences.length > 0 ? 'warning' : 'positive'}
      />
      <KpiCard label="Sites couverts" value={String(aggregate.siteCount)} hint="périmètre du rapport" />
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'critical';
}) {
  return (
    <div className={`${styles.kpiCard} ${styles[`kpi_${tone}`]}`}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
      {hint ? <span className={styles.kpiHint}>{hint}</span> : null}
    </div>
  );
}

function DomainBody({ aggregate }: { aggregate: ReportAggregate }) {
  const sentences = domainNarrative(aggregate);
  return (
    <>
      <div className={styles.twoCol}>
        <div className={styles.chartBlock}>
          <DomainConformityChart domains={aggregate.domains} />
        </div>
        <div className={styles.narrativeBlock}>
          {sentences.length === 0 ? (
            <p className={styles.narrative}>
              Aucune mesure exploitable sur la période — section non applicable.
            </p>
          ) : (
            sentences.map((s) => <NarrativeLine key={s.ruleId} sentence={s} />)
          )}
        </div>
      </div>
      {aggregate.domains.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Domaine</th>
              <th>Mesures</th>
              <th>Conformes</th>
              <th>Surveillance</th>
              <th>Critiques</th>
              <th>Niveau dominant</th>
            </tr>
          </thead>
          <tbody>
            {aggregate.domains.map((d) => (
              <tr key={d.domain}>
                <td>{DOMAIN_LABEL[d.domain] ?? d.domain}</td>
                <td>{d.total}</td>
                <td>{d.conforming}</td>
                <td>{d.warning}</td>
                <td>{d.critical}</td>
                <td>
                  <span className={`${styles.pill} ${styles[`pill_${d.worst}`]}`}>
                    {labelLevel(d.worst)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  );
}

function DomainConformityChart({ domains }: { domains: DomainConformity[] }) {
  if (domains.length === 0) return <div className={styles.emptyChart}>Aucune mesure</div>;
  const labels = domains.map((d) => DOMAIN_LABEL[d.domain] ?? d.domain);
  const data = {
    labels,
    datasets: [
      { label: 'Conformes', data: domains.map((d) => d.conforming), backgroundColor: '#16a34a' },
      { label: 'Surveillance', data: domains.map((d) => d.warning), backgroundColor: '#f59e0b' },
      { label: 'Critiques', data: domains.map((d) => d.critical), backgroundColor: '#dc2626' },
    ],
  };
  return (
    <Bar
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
      }}
    />
  );
}

function ExceedancesBody({ aggregate }: { aggregate: ReportAggregate }) {
  const intro = exceedancesIntro(aggregate);
  return (
    <>
      {intro ? <NarrativeLine sentence={intro} /> : null}
      {aggregate.topExceedances.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Indicateur</th>
              <th>Valeur</th>
              <th>Plage de référence</th>
              <th>Source</th>
              <th>Site</th>
              <th>Date</th>
              <th>Niveau</th>
            </tr>
          </thead>
          <tbody>
            {aggregate.topExceedances.map((e: TopExceedance) => (
              <tr key={`${e.collectionId}-${e.indicatorId}`}>
                <td>{e.indicatorLabel}</td>
                <td>
                  <strong>{formatNum(e.value)}</strong> {e.unit}
                </td>
                <td>
                  {e.threshold.min != null ? `${e.threshold.min}` : '—'}
                  {' – '}
                  {e.threshold.max != null ? `${e.threshold.max}` : '—'}
                  {e.unit ? ` ${e.unit}` : ''}
                </td>
                <td>{e.source}</td>
                <td>{e.siteId}</td>
                <td>{formatShort(e.collectedAt)}</td>
                <td>
                  <span className={`${styles.pill} ${styles[`pill_${e.level}`]}`}>
                    {e.level === 'critical' ? 'Critique' : 'Surveillance'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  );
}

function AlertsBody({ aggregate }: { aggregate: ReportAggregate }) {
  const a = aggregate.alerts;
  return (
    <div className={styles.twoCol}>
      <div className={styles.chartBlock}>
        {a.total > 0 ? (
          <Doughnut
            data={{
              labels: ['Critiques', 'Surveillance'],
              datasets: [
                {
                  data: [a.critical, a.warning],
                  backgroundColor: ['#dc2626', '#f59e0b'],
                  borderWidth: 0,
                },
              ],
            }}
            options={{ plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }}
          />
        ) : (
          <div className={styles.emptyChart}>Aucune alerte sur la période</div>
        )}
      </div>
      <div className={styles.statBlock}>
        <DataLine label="Total déclenchées" value={String(a.total)} />
        <DataLine label="Actives en fin de période" value={String(a.active)} />
        <DataLine label="Prises en compte" value={String(a.acknowledged)} />
        <DataLine label="Résolues" value={String(a.resolved)} />
        <DataLine
          label="Délai médian de résolution"
          value={a.medianResolutionHours == null ? '—' : `${Math.round(a.medianResolutionHours)} heures`}
        />
      </div>
    </div>
  );
}

function LabBody({ aggregate }: { aggregate: ReportAggregate }) {
  const l = aggregate.lab;
  return (
    <>
      <div className={styles.statBlock}>
        <DataLine label="Échantillons envoyés" value={String(l.total)} />
        <DataLine label="Bordereaux reçus" value={`${l.received} / ${l.total}`} />
        <DataLine label="En attente" value={String(l.pending)} />
        <DataLine
          label="Délai médian de retour"
          value={l.medianTurnaroundDays == null ? '—' : `${l.medianTurnaroundDays.toFixed(1)} jours`}
        />
        <DataLine label="Retards (>10 j SLA)" value={String(l.overdue)} tone={l.overdue > 0 ? 'warning' : 'neutral'} />
      </div>
      <p className={styles.note}>
        SLA contractuel : 10 jours ouvrés pour le rendu d'un bordereau d'analyse. Laboratoire
        de référence : LNE — Laboratoire National des Eaux (Bamako).
      </p>
    </>
  );
}

function SilencesBody({ aggregate }: { aggregate: ReportAggregate }) {
  if (aggregate.silences.length === 0) {
    return (
      <p className={styles.narrative}>
        Tous les sites du périmètre ont été collectés à fréquence régulière sur la période.
      </p>
    );
  }
  return (
    <>
      <p className={styles.narrative}>
        Les sites suivants n'ont pas reçu de collecte depuis plus de 14 jours :
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Site</th>
            <th>Dernière collecte</th>
            <th>Jours sans collecte</th>
          </tr>
        </thead>
        <tbody>
          {aggregate.silences.map((s) => (
            <tr key={s.siteId}>
              <td>{s.shortName}</td>
              <td>{s.lastCollectionAt ? formatShort(s.lastCollectionAt) : 'Aucune'}</td>
              <td>
                <strong>{s.daysSilent}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function BaselineBody({ aggregate }: { aggregate: ReportAggregate }) {
  const rows = baselineComparison(aggregate);
  return (
    <>
      <p className={styles.narrative}>
        Les paramètres mesurés sur la période sont rapprochés des valeurs établies par le
        Diagnostic environnemental conduit par le PNUD en février-mars 2025.
      </p>
      {rows.length === 0 ? (
        <p className={styles.note}>
          Aucune valeur exploitable sur la période permet une comparaison directe.
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Paramètre</th>
              <th>Référence 2025</th>
              <th>Période courante</th>
              <th>Tendance</th>
              <th>Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ruleId}>
                <td>{r.parameter}</td>
                <td>{r.baseline}</td>
                <td>
                  <strong>{r.current}</strong>
                </td>
                <td>
                  <span className={`${styles.pill} ${styles[`trend_${r.trend}`]}`}>
                    {r.trend === 'improving' ? '↘ Amélioration' : r.trend === 'worsening' ? '↗ Dégradation' : '→ Stable'}
                  </span>
                </td>
                <td>{r.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function RecommendationsBody({ aggregate }: { aggregate: ReportAggregate }) {
  const recos = recommendations(aggregate);
  return (
    <ol className={styles.recoList}>
      {recos.map((r) => (
        <li key={r.ruleId} className={`${styles.recoItem} ${styles[`reco_${r.tone}`]}`}>
          {r.text}
        </li>
      ))}
    </ol>
  );
}

function LegalBody() {
  return (
    <>
      <p className={styles.narrative}>
        Les indicateurs et seuils mobilisés dans le présent rapport s'appuient sur les textes
        suivants :
      </p>
      <ul className={styles.legalList}>
        <li><strong>Loi n°2021-032</strong> du 24 mai 2021 — Pollutions et nuisances (art. 17).</li>
        <li><strong>Loi n°02-006</strong> du 31 janvier 2002 — Code de l'eau (art. 14).</li>
        <li><strong>Décret n°01-394/P-RM</strong> du 6 septembre 2001 — gestion des eaux usées.</li>
        <li><strong>Norme malienne MN-03-02/002:2006</strong> — eaux usées.</li>
        <li><strong>Décret n°96-178/P-RM</strong> — hygiène et sécurité au travail.</li>
        <li><strong>OMS</strong> — Directives qualité de l'eau (2017), qualité de l'air (PM2,5/PM10/CO₂).</li>
        <li><strong>OMS EHC</strong> — métaux lourds (Pb 165, Zn 221, Cd 223, As 224).</li>
        <li><strong>Conv. OIT n°148</strong> — protection des travailleurs contre les risques professionnels.</li>
        <li><strong>Loi malienne n°2013-015</strong> — protection des données personnelles.</li>
      </ul>
    </>
  );
}

function AppendixBody({ aggregate }: { aggregate: ReportAggregate }) {
  const sample = aggregate.collections.slice(0, 30);
  return (
    <>
      <p className={styles.note}>
        Liste partielle limitée à 30 entrées dans le rapport imprimé. Le fichier XLSX exporté
        contient l'ensemble des collectes ({aggregate.collections.length} entrées).
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Collecte</th>
            <th>Site</th>
            <th>Date</th>
            <th>Statut</th>
            <th>Mesures</th>
            <th>Photos</th>
          </tr>
        </thead>
        <tbody>
          {sample.map((c) => (
            <tr key={c.id}>
              <td>{c.id.slice(-6).toUpperCase()}</td>
              <td>{c.siteId}</td>
              <td>{formatShort(c.collectedAt)}</td>
              <td>{c.status}</td>
              <td>{c.measurements.length}</td>
              <td>{c.photos.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ─────────── Helpers ─────────── */
function DataLine({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'warning' | 'critical' | 'positive';
}) {
  return (
    <div className={`${styles.dataLine} ${styles[`data_${tone}`]}`}>
      <span className={styles.dataLabel}>{label}</span>
      <span className={styles.dataValue}>{value}</span>
    </div>
  );
}

function formatLong(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatNum(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}
function labelLevel(l: string): string {
  if (l === 'conforming') return 'Conforme';
  if (l === 'warning') return 'À surveiller';
  return 'Critique';
}
