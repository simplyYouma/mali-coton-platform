import { useState } from 'react';
import { AlertTriangle, CheckCircle2, MinusCircle, HelpCircle } from 'lucide-react';
import { Skeleton } from '@/components/common';
import { useConformiteSite } from '@/features/conformite/hooks/useConformite';
import type { StatutConformite, ParametreConformite } from '@/features/conformite/api/conformite';
import styles from './ConformiteSitePanel.module.css';

// ── Labels ────────────────────────────────────────────────────────────────────

const STATUT_LABEL: Record<StatutConformite, string> = {
  CONFORME: 'Conforme',
  A_SURVEILLER: 'À surveiller',
  CRITIQUE: 'Critique',
  NON_EVALUE: 'Non évalué',
};

const MILIEU_LABEL: Record<string, string> = {
  AIR: 'Air',
  EAU: 'Eau usée',
  SOL: 'Sol / Sédiment',
};

const RAISON_LABEL: Record<string, string> = {
  SEUIL_ABSENT: 'Aucun seuil configuré',
  VALEUR_NON_NUMERIQUE: 'Valeur non numérique',
};

function fmtPct(v: number | null): string {
  if (v === null) return '—';
  return `${v.toFixed(1)} %`;
}

// ── Mini-badge statut ─────────────────────────────────────────────────────────

function StatutBadge({ statut, size = 'md' }: { statut: StatutConformite; size?: 'sm' | 'md' }) {
  return (
    <span className={`${styles.statutBadge} ${styles[`statut_${statut}`]} ${size === 'sm' ? styles.statutBadgeSm : ''}`}>
      {STATUT_LABEL[statut] ?? statut}
    </span>
  );
}

// ── Jauge de conformité ───────────────────────────────────────────────────────

function GaugeBar({ pct, statut }: { pct: number | null; statut: StatutConformite }) {
  if (pct === null) return <span className={styles.gaugePlaceholder}>Non évalué</span>;
  return (
    <div className={styles.gaugeWrap}>
      <div className={styles.gaugeTrack}>
        <div
          className={`${styles.gaugeFill} ${styles[`gaugeFill_${statut}`]}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className={styles.gaugePct}>{fmtPct(pct)}</span>
    </div>
  );
}

// ── Ligne paramètre ───────────────────────────────────────────────────────────

function ParamRow({ p }: { p: ParametreConformite }) {
  const seuilTxt =
    p.seuil
      ? `${p.seuil.valeurMin !== null ? p.seuil.valeurMin : '—'} – ${p.seuil.valeurMax !== null ? p.seuil.valeurMax : '—'} ${p.seuil.unite ?? ''}`
      : '—';

  return (
    <tr className={`${styles.paramRow} ${styles[`paramRow_${p.statut}`]}`}>
      <td className={styles.tdLibelle}>{p.libelle || p.code}</td>
      <td className={styles.tdValeur}>
        <span className={styles.valeurBrute}>{p.valeurBrute || '—'}</span>
        {p.unite && <span className={styles.unite}>{p.unite}</span>}
      </td>
      <td className={styles.tdSeuil}>{seuilTxt}</td>
      <td className={styles.tdNorme}>
        {p.seuil?.norme.code
          ? <span className={styles.normeBadge}>{p.seuil.norme.code.replace('_REJET', '')}</span>
          : '—'}
      </td>
      <td className={styles.tdStatut}>
        {p.statut === 'CONFORME' && (
          <span className={styles.conformeOk}><CheckCircle2 size={13} />Conforme</span>
        )}
        {p.statut === 'NON_CONFORME' && (
          <span className={styles.conformeNok}><AlertTriangle size={13} />Non conforme</span>
        )}
        {p.statut === 'A_SURVEILLER' && (
          <span className={styles.conformeWarn}><MinusCircle size={13} />À surveiller</span>
        )}
        {p.statut === 'NON_EVALUE' && (
          <span className={styles.conformeNd} title={RAISON_LABEL[p.raison ?? ''] ?? p.raison}>
            <HelpCircle size={13} />{RAISON_LABEL[p.raison ?? ''] ?? 'Non évalué'}
          </span>
        )}
      </td>
    </tr>
  );
}

// ── Panneau principal ─────────────────────────────────────────────────────────

interface ConformiteSitePanelProps {
  siteId: string | undefined;
}

export function ConformiteSitePanel({ siteId }: ConformiteSitePanelProps) {
  const { data, isLoading, isError } = useConformiteSite(siteId);
  const [activeCode, setActiveCode] = useState<string>('');

  if (isLoading) {
    return (
      <div className={styles.skeleton}>
        <Skeleton height={72} />
        <Skeleton height={40} />
        <Skeleton height={240} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.empty}>
        <AlertTriangle size={24} />
        <span>Données de conformité indisponibles pour ce site.</span>
      </div>
    );
  }

  const { resume, composantes } = data;

  const activeComposante =
    composantes.find((c) => c.code === activeCode) ?? composantes[0];

  return (
    <div className={styles.root}>
      {/* ── Résumé ── */}
      <section className={styles.resumeStrip} aria-label="Résumé de conformité">
        <div className={styles.resumeCell}>
          <span className={styles.resumeLabel}>Statut global</span>
          <StatutBadge statut={resume.statut} />
        </div>
        <div className={styles.resumeCell}>
          <span className={styles.resumeLabel}>Taux de conformité</span>
          <GaugeBar pct={resume.tauxConformite} statut={resume.statut} />
        </div>
        <div className={styles.resumeCell}>
          <span className={styles.resumeLabel}>Couverture évaluation</span>
          <span className={styles.resumeValue}>{fmtPct(resume.couvertureEvaluation)}</span>
        </div>
        <div className={styles.resumeCell}>
          <span className={styles.resumeLabel}>Conformes</span>
          <span className={`${styles.resumeValue} ${styles.resumeOk}`}>{resume.conformes}</span>
        </div>
        <div className={styles.resumeCell}>
          <span className={styles.resumeLabel}>Non conformes</span>
          <span className={`${styles.resumeValue} ${styles.resumeNok}`}>{resume.nonConformes}</span>
        </div>
        <div className={styles.resumeCell}>
          <span className={styles.resumeLabel}>Non évalués</span>
          <span className={styles.resumeValue}>{resume.nonEvalues}</span>
        </div>
      </section>

      {/* ── Tuiles composantes ── */}
      <div className={styles.composanteGrid} role="tablist" aria-label="Milieux">
        {composantes.map((c) => {
          const active = (activeComposante?.code ?? '') === c.code;
          return (
            <button
              key={c.code}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.composanteTile} ${active ? styles.composanteTileActive : ''}`}
              onClick={() => setActiveCode(c.code)}
            >
              <span className={styles.composanteCode}>{MILIEU_LABEL[c.code] ?? c.code}</span>
              <StatutBadge statut={c.statut} size="sm" />
              <div className={styles.composanteMini}>
                <GaugeBar pct={c.tauxConformite} statut={c.statut} />
              </div>
              <div className={styles.composanteCounters}>
                <span className={styles.cOk}>{c.conformes} ✓</span>
                <span className={styles.cNok}>{c.nonConformes} ✗</span>
                <span className={styles.cNd}>{c.nonEvalues} —</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Tableau des paramètres ── */}
      {activeComposante && (
        <section className={styles.tableSection} aria-label={`Paramètres — ${MILIEU_LABEL[activeComposante.code] ?? activeComposante.code}`}>
          <header className={styles.tableHead}>
            <h3 className={styles.tableTitle}>
              {MILIEU_LABEL[activeComposante.code] ?? activeComposante.code}
            </h3>
            <span className={styles.tableMeta}>
              {activeComposante.evaluables} paramètre{activeComposante.evaluables !== 1 ? 's' : ''} évaluable{activeComposante.evaluables !== 1 ? 's' : ''} ·{' '}
              couverture {fmtPct(activeComposante.couvertureEvaluation)}
            </span>
          </header>

          <div className={styles.tableWrap}>
            <table className={styles.paramTable}>
              <thead>
                <tr>
                  <th>Paramètre</th>
                  <th>Valeur</th>
                  <th>Seuil admis</th>
                  <th>Norme</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {activeComposante.parametres.map((p) => (
                  <ParamRow key={p.id} p={p} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
