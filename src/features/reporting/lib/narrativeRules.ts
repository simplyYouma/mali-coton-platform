import type { ReportAggregate } from './aggregator';

/**
 * Moteur narratif — produit des phrases factuelles à partir des KPIs
 * agrégés. Aucune interprétation libre : chaque phrase est issue d'une
 * règle déterministe identifiable par son `ruleId` (auditable).
 *
 * Pas de LLM, pas d'intervention humaine. Le texte rendu reste neutre,
 * sourcé sur les seuils OMS / normes maliennes (CDC §1.4, §4).
 */

export interface NarrativeSentence {
  ruleId: string;
  text: string;
  /** Sévérité visuelle de la phrase — pour souligner les phrases critiques. */
  tone: 'neutral' | 'positive' | 'warning' | 'critical';
}

const DOMAIN_LABEL_FR: Record<string, string> = {
  water: 'eaux usées',
  soil: 'sol',
  air: 'air',
  waste: 'déchets solides',
  health: 'santé / SST',
  socio: 'socio-économique',
};

/** Retourne les phrases narratives de la section « Synthèse exécutive ». */
export function executiveSummary(agg: ReportAggregate): NarrativeSentence[] {
  const out: NarrativeSentence[] = [];
  const { validation, alerts, period, siteCount, scope } = agg;

  out.push({
    ruleId: 'narrative.summary.scope',
    text: scope.siteId
      ? `Le présent rapport couvre la période du ${formatFr(period.from)} au ${formatFr(period.to)} et porte sur le site ciblé.`
      : `Le présent rapport couvre la période du ${formatFr(period.from)} au ${formatFr(period.to)} et consolide les données des ${siteCount} sites pilotes.`,
    tone: 'neutral',
  });

  if (validation.total === 0) {
    out.push({
      ruleId: 'narrative.summary.empty',
      text: "Aucune collecte n'a été enregistrée sur la période. Le suivi terrain doit être relancé avant la prochaine cadence de reporting.",
      tone: 'warning',
    });
    return out;
  }

  out.push({
    ruleId: 'narrative.summary.validation',
    text: `${validation.total} collectes ont été soumises sur la période, dont ${validation.validated} validées (${validation.validationRate}%), ${validation.needsCorrection} en attente de correction et ${validation.rejected} rejetées.`,
    tone: validation.validationRate >= 80 ? 'positive' : validation.validationRate >= 60 ? 'neutral' : 'warning',
  });

  if (alerts.critical > 0) {
    out.push({
      ruleId: 'narrative.summary.criticalAlerts',
      text: `${alerts.critical} alerte${alerts.critical > 1 ? 's' : ''} critique${alerts.critical > 1 ? 's' : ''} ${alerts.critical > 1 ? 'ont été déclenchées' : 'a été déclenchée'} sur la période, dont ${alerts.resolved} résolue${alerts.resolved > 1 ? 's' : ''}${alerts.medianResolutionHours != null ? ` (délai médian ${Math.round(alerts.medianResolutionHours)} h)` : ''}.`,
      tone: alerts.active > 0 ? 'critical' : 'warning',
    });
  } else {
    out.push({
      ruleId: 'narrative.summary.noCritical',
      text: 'Aucune alerte critique n\'a été déclenchée sur la période — situation environnementale stable au regard des seuils OMS et maliens.',
      tone: 'positive',
    });
  }

  if (agg.lab.overdue > 0) {
    out.push({
      ruleId: 'narrative.summary.labOverdue',
      text: `${agg.lab.overdue} bordereau${agg.lab.overdue > 1 ? 'x' : ''} laboratoire ${agg.lab.overdue > 1 ? 'sont en retard' : 'est en retard'} au regard du SLA contractuel (10 jours ouvrés).`,
      tone: 'warning',
    });
  }

  return out;
}

/** Phrases pour la section « Conformité par domaine ». */
export function domainNarrative(agg: ReportAggregate): NarrativeSentence[] {
  return agg.domains.map((d) => {
    const label = DOMAIN_LABEL_FR[d.domain] ?? d.domain;
    if (d.critical > 0) {
      return {
        ruleId: `narrative.domain.${d.domain}.critical`,
        text: `Domaine ${label} : ${d.total} mesures, dont ${d.critical} en dépassement critique des seuils de référence et ${d.warning} en zone de surveillance.`,
        tone: 'critical',
      };
    }
    if (d.warning > 0) {
      return {
        ruleId: `narrative.domain.${d.domain}.warning`,
        text: `Domaine ${label} : ${d.total} mesures, ${d.warning} en zone de surveillance, ${d.conforming} conformes.`,
        tone: 'warning',
      };
    }
    return {
      ruleId: `narrative.domain.${d.domain}.ok`,
      text: `Domaine ${label} : ${d.total} mesures toutes conformes aux seuils OMS / Norme MN-03-02/002:2006.`,
      tone: 'positive',
    };
  });
}

/** Phrase introductive de la section dépassements. */
export function exceedancesIntro(agg: ReportAggregate): NarrativeSentence | null {
  if (agg.topExceedances.length === 0) {
    return {
      ruleId: 'narrative.exceedances.none',
      text: 'Aucun dépassement de seuil n\'est à signaler sur la période.',
      tone: 'positive',
    };
  }
  const critical = agg.topExceedances.filter((e) => e.level === 'critical').length;
  return {
    ruleId: 'narrative.exceedances.summary',
    text: `${agg.topExceedances.length} dépassements relevés sur la période, dont ${critical} critique${critical > 1 ? 's' : ''}. Les valeurs ci-dessous sont rapprochées des seuils OMS et de la Norme malienne MN-03-02/002:2006.`,
    tone: critical > 0 ? 'critical' : 'warning',
  };
}

/** Recommandations issues des patterns détectés (rapport final / trimestriel). */
export function recommendations(agg: ReportAggregate): NarrativeSentence[] {
  const out: NarrativeSentence[] = [];

  // pH eaux usées dépassé de manière chronique → station de neutralisation
  const phExceedances = agg.topExceedances.filter((e) => e.indicatorId === 'water.ph');
  if (phExceedances.length >= 2) {
    const sites = Array.from(new Set(phExceedances.map((e) => e.siteId)));
    out.push({
      ruleId: 'narrative.reco.phChronic',
      text: `Dépassements pH récurrents sur ${sites.length} site${sites.length > 1 ? 's' : ''} (${phExceedances.length} cas). Recommandation : déploiement d'unités de neutralisation acide-base avant rejet, conformément à la Loi n°2021-032 art. 17.`,
      tone: 'critical',
    });
  }

  // Sulfates très élevés → traitement physico-chimique
  const sulfExceedances = agg.topExceedances.filter((e) => e.indicatorId === 'water.sulfates');
  if (sulfExceedances.length > 0) {
    out.push({
      ruleId: 'narrative.reco.sulfates',
      text: `Concentrations en sulfates supérieures aux seuils OMS sur ${sulfExceedances.length} prélèvement${sulfExceedances.length > 1 ? 's' : ''} — usage d'hydrosulfite documenté. Recommandation : substitution progressive vers des fixateurs alternatifs (cf. Diagnostic 2025 §4.8.2).`,
      tone: 'critical',
    });
  }

  // Bordereaux labo en retard → renforcer la chaîne logistique
  if (agg.lab.overdue >= 2) {
    out.push({
      ruleId: 'narrative.reco.labLogistics',
      text: `Retards laboratoire récurrents (${agg.lab.overdue} bordereaux > 10 jours). Recommandation : revoir la chaîne logistique avec le LNE Bamako ou activer un laboratoire de secours du référentiel.`,
      tone: 'warning',
    });
  }

  // Sites silencieux → renforcer la présence terrain
  if (agg.silences.length > 0) {
    const names = agg.silences.slice(0, 3).map((s) => s.shortName).join(', ');
    out.push({
      ruleId: 'narrative.reco.siteSilence',
      text: `${agg.silences.length} site${agg.silences.length > 1 ? 's' : ''} sans collecte depuis plus de 14 jours (${names}). Recommandation : reprogrammer une visite terrain dès la semaine prochaine.`,
      tone: 'warning',
    });
  }

  // EPI faible → action de sensibilisation
  const epiExceedances = agg.topExceedances.filter((e) => e.indicatorId === 'health.epi_usage');
  if (epiExceedances.length > 0) {
    out.push({
      ruleId: 'narrative.reco.epi',
      text: `Taux d'utilisation des EPI insuffisant sur ${epiExceedances.length} relevé${epiExceedances.length > 1 ? 's' : ''}. Recommandation : action de sensibilisation et dotation complémentaire (Décret n°96-178/P-RM, Conv. OIT 148).`,
      tone: 'warning',
    });
  }

  if (out.length === 0) {
    out.push({
      ruleId: 'narrative.reco.none',
      text: 'Aucune recommandation corrective ne se dégage des données de la période — maintenir la cadence de suivi en l\'état.',
      tone: 'positive',
    });
  }
  return out;
}

/** Comparaison aux valeurs de référence du Diagnostic 2025 (rapport final). */
export interface BaselineComparison {
  ruleId: string;
  parameter: string;
  baseline: string;
  current: string;
  trend: 'improving' | 'stable' | 'worsening';
  comment: string;
}

export function baselineComparison(agg: ReportAggregate): BaselineComparison[] {
  const out: BaselineComparison[] = [];

  // pH ATPEK référence 9,62
  const phAtpek = agg.collections
    .filter((c) => c.siteId === 'site-atpek')
    .flatMap((c) => c.measurements)
    .find((m) => m.indicatorId === 'water.ph' && typeof m.value === 'number');
  if (phAtpek && typeof phAtpek.value === 'number') {
    const v = phAtpek.value;
    out.push({
      ruleId: 'narrative.baseline.phAtpek',
      parameter: 'pH eaux usées — ATPEK',
      baseline: '9,62 (Diagnostic 2025)',
      current: v.toFixed(2),
      trend: v < 9.0 ? 'improving' : v > 10 ? 'worsening' : 'stable',
      comment: v < 8.5 ? 'Retour dans la plage OMS (6,5–8,5).' : 'Toujours hors plage OMS.',
    });
  }

  // pH Dianéguéla référence 11,25
  const phDian = agg.collections
    .filter((c) => c.siteId === 'site-dianeguela')
    .flatMap((c) => c.measurements)
    .find((m) => m.indicatorId === 'water.ph' && typeof m.value === 'number');
  if (phDian && typeof phDian.value === 'number') {
    const v = phDian.value;
    out.push({
      ruleId: 'narrative.baseline.phDianeguela',
      parameter: 'pH eaux usées — Dianéguéla',
      baseline: '11,25 (Diagnostic 2025)',
      current: v.toFixed(2),
      trend: v < 10.5 ? 'improving' : v > 11 ? 'stable' : 'stable',
      comment: 'Site identifié comme prioritaire pour station de neutralisation.',
    });
  }

  // PM2,5 référence 25 µg/m³
  const pm25Vals = agg.collections
    .flatMap((c) => c.measurements)
    .filter((m) => m.indicatorId === 'air.pm25' && typeof m.value === 'number')
    .map((m) => m.value as number);
  if (pm25Vals.length > 0) {
    const avg = pm25Vals.reduce((s, v) => s + v, 0) / pm25Vals.length;
    out.push({
      ruleId: 'narrative.baseline.pm25',
      parameter: 'PM2,5 air — moyenne sites',
      baseline: '25 µg/m³ (Diagnostic 2025, max relevé)',
      current: `${avg.toFixed(1)} µg/m³`,
      trend: avg < 15 ? 'improving' : avg < 25 ? 'stable' : 'worsening',
      comment: 'Seuil OMS 24 h : 25 µg/m³ ; seuil annuel : 10 µg/m³.',
    });
  }

  return out;
}

function formatFr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
