/**
 * Moteur de règles — actions recommandées d'alerte.
 *
 * Source unique de vérité pour le texte affiché sous chaque alerte. Permet :
 * - traçabilité (chaque alerte → ruleId identifiable dans l'UI et l'audit)
 * - cohérence rédactionnelle entre alertes du même type
 * - extensibilité Phase 2 (édition par admin via /admin/seuils)
 *
 * Sources documentaires :
 *   - Norme malienne MN-03-02/002:2006 (rejets eaux usées)
 *   - OMS — Guidelines drinking water + Air quality
 */

import type {
  AlertCategory,
  AlertEntry,
  AlertSeverity,
} from '../api/alerts.types';

export interface ActionRule {
  /** ID stable utilisé dans l'audit + le footer "Comment l'alerte a été générée". */
  ruleId: string;
  /** Filtre. Wildcard `*` accepté sur indicatorId. */
  match: {
    category: AlertCategory;
    indicatorId?: string;
    severity?: AlertSeverity;
  };
  /** Texte de l'action. Placeholders : {value} {threshold} {unit} {site} {source} {sampleId} {labName}. */
  template: string;
  /** Description courte de la règle (affichée dans le footer "comment générée"). */
  description: string;
}

export const ACTION_RULES: ActionRule[] = [
  /* ───── Eaux usées — pH ───── */
  {
    ruleId: 'rule.water.ph.critical',
    match: { category: 'threshold_exceeded', indicatorId: 'water.ph', severity: 'critical' },
    template:
      'Visite terrain prioritaire — vérifier le neutralisant utilisé et l\'absence de rejet direct. À pH ≥ 10, l\'effluent est corrosif et perturbe immédiatement les écosystèmes aquatiques. Cause probable : usage intensif de soude caustique sans dilution.',
    description: 'pH eaux usées critique — protocole de neutralisation insuffisant.',
  },
  {
    ruleId: 'rule.water.ph.warning',
    match: { category: 'threshold_exceeded', indicatorId: 'water.ph', severity: 'warning' },
    template:
      'Surveiller la prochaine collecte. Sensibiliser sur le dosage du neutralisant et la fréquence de vidange des bains.',
    description: 'pH eaux usées au-dessus du seuil malien (6,5–9,5).',
  },

  /* ───── Eaux usées — Sulfates ───── */
  {
    ruleId: 'rule.water.sulfates.critical',
    match: { category: 'threshold_exceeded', indicatorId: 'water.sulfates', severity: 'critical' },
    template:
      'Évaluer la quantité d\'hydrosulfite utilisée. Proposer un protocole de dilution avant rejet et un traitement par flottation/électrocoagulation.',
    description: 'Concentration sulfates très supérieure à la norme malienne (≤ 1500 mg/L).',
  },

  /* ───── Eaux usées — DCO ───── */
  {
    ruleId: 'rule.water.dco.critical',
    match: { category: 'threshold_exceeded', indicatorId: 'water.dco', severity: 'critical' },
    template:
      'Charge organique exceptionnelle. Prévoir prétraitement physico-chimique (neutralisation + coagulation-floculation) avant tout rejet. Le ratio DCO/DBO5 élevé indique une faible biodégradabilité — un traitement biologique seul est insuffisant.',
    description: 'DCO supérieure à la norme malienne (75–120 mg/L) — référence Diagnostic §4.2.',
  },

  /* ───── Eaux usées — métaux lourds ───── */
  {
    ruleId: 'rule.water.metals.critical',
    match: { category: 'threshold_exceeded', indicatorId: 'water.lead', severity: 'critical' },
    template:
      'Contamination métaux lourds — risque sanitaire majeur (bioaccumulation chaîne alimentaire). Étude pédologique requise. Suspendre tout rejet direct vers les caniveaux jusqu\'à mise en place d\'une digestion acide + filtration.',
    description: 'Métaux lourds (Pb/Cd/Cr) supérieurs aux seuils maliens — référence §4.2 Diagnostic.',
  },

  /* ───── Air ───── */
  {
    ruleId: 'rule.air.pm25.critical',
    match: { category: 'threshold_exceeded', indicatorId: 'air.pm25', severity: 'critical' },
    template:
      'Améliorer la ventilation de l\'atelier. Imposer le port d\'EPI (masque FFP2 minimum) à tous les opérateurs présents. Risque inhalation aérosols et particules fines.',
    description: 'PM2,5 air supérieures au seuil OMS (25 µg/m³ sur 24 h).',
  },
  {
    ruleId: 'rule.air.pm25.warning',
    match: { category: 'threshold_exceeded', indicatorId: 'air.pm25', severity: 'warning' },
    template:
      'Sensibiliser au port du masque. Aérer largement entre les phases de cuisson et de teinture.',
    description: 'PM2,5 proches du seuil — vigilance sur les conditions de travail.',
  },

  /* ───── Sol ───── */
  {
    ruleId: 'rule.soil.ph.critical',
    match: { category: 'threshold_exceeded', indicatorId: 'soil.ph', severity: 'critical' },
    template:
      'Sol fortement alcalinisé — accumulation chronique des rejets dans le substrat. Limiter l\'infiltration en attendant la mise en place de bassins de rétention étanches (cf. Diagnostic §4.8.1 fosse biofil).',
    description: 'pH du sol hors plage 6,5–9 (norme sols ordinaires).',
  },

  /* ───── Santé / SST ───── */
  {
    ruleId: 'rule.health.epi.critical',
    match: {
      category: 'threshold_exceeded',
      indicatorId: 'health.epi_usage',
      severity: 'critical',
    },
    template:
      'Couverture EPI insuffisante (< 50 %). Formation obligatoire avant la prochaine opération de teinture. Vérifier la disponibilité physique des EPI sur site.',
    description: 'Taux d\'utilisation des EPI sous le seuil de sécurité.',
  },
  {
    ruleId: 'rule.health.epi.warning',
    match: {
      category: 'threshold_exceeded',
      indicatorId: 'health.epi_usage',
      severity: 'warning',
    },
    template:
      'Renforcer l\'incitation au port d\'EPI. Stocker les EPI à un endroit accessible avant les opérations.',
    description: 'Taux EPI en deçà du standard recommandé.',
  },

  /* ───── Bordereau labo en retard ───── */
  {
    ruleId: 'rule.lab.overdue',
    match: { category: 'lab_overdue' },
    template:
      'Relancer le laboratoire {labName}. Le délai contractuel d\'analyse est dépassé. Bordereau {sampleId} — vérifier l\'état d\'avancement (réception, conditionnement, analyse).',
    description: 'Délai d\'analyse laboratoire dépassé.',
  },

  /* ───── Silence site ───── */
  {
    ruleId: 'rule.site.silence',
    match: { category: 'site_silence' },
    template:
      'Aucune collecte enregistrée sur {site} depuis plus de 14 jours. Contacter l\'agent assigné — vérifier accessibilité du site et disponibilité de l\'équipement.',
    description: 'Inactivité prolongée d\'un site pilote.',
  },

  /* ───── Qualité données ───── */
  {
    ruleId: 'rule.data.quality',
    match: { category: 'data_quality' },
    template:
      'Saisie incohérente détectée. Vérifier la cohérence des mesures avec l\'historique du site. Demander correction à l\'agent si nécessaire.',
    description: 'Anomalie statistique sur les mesures.',
  },

  /* ───── Fallback générique ───── */
  {
    ruleId: 'rule.threshold.generic',
    match: { category: 'threshold_exceeded' },
    template:
      'Mesure {value}{unit} hors du seuil normatif {threshold}{unit} ({source}). Vérifier la procédure de mesure et planifier une visite de contrôle.',
    description: 'Dépassement de seuil — règle générique par défaut.',
  },
];

/**
 * Trouve la règle la plus spécifique applicable à une alerte.
 * Ordre de priorité : matchs avec indicatorId + severity > category seul.
 */
export function findActionRule(alert: AlertEntry): ActionRule | null {
  /* 1. Match exact category + indicatorId + severity */
  const exact = ACTION_RULES.find(
    (r) =>
      r.match.category === alert.category &&
      r.match.indicatorId === alert.indicatorId &&
      r.match.severity === alert.severity,
  );
  if (exact) return exact;

  /* 2. Match category + indicatorId (n'importe quelle severity) */
  const byIndicator = ACTION_RULES.find(
    (r) =>
      r.match.category === alert.category &&
      r.match.indicatorId === alert.indicatorId &&
      r.match.severity === undefined,
  );
  if (byIndicator) return byIndicator;

  /* 3. Match category seul (fallback générique) */
  const byCategory = ACTION_RULES.find(
    (r) =>
      r.match.category === alert.category &&
      r.match.indicatorId === undefined &&
      r.match.severity === undefined,
  );
  return byCategory ?? null;
}

/**
 * Résout le texte de l'action recommandée en remplaçant les placeholders.
 * Retourne `null` si aucune règle ne matche (cas explicite, pas de fallback magique).
 */
export function getRecommendedAction(
  alert: AlertEntry,
  context: { siteName?: string; labName?: string } = {},
): { text: string; ruleId: string } | null {
  const rule = findActionRule(alert);
  if (!rule) return null;

  const text = rule.template
    .replace(/\{value\}/g, String(alert.measured?.value ?? '—'))
    .replace(/\{threshold\}/g, String(alert.threshold?.value ?? '—'))
    .replace(/\{unit\}/g, alert.measured?.unit ?? alert.threshold?.unit ?? '')
    .replace(/\{source\}/g, alert.thresholdSource ?? 'norme applicable')
    .replace(/\{site\}/g, context.siteName ?? alert.siteId ?? 'le site')
    .replace(/\{sampleId\}/g, '—')
    .replace(/\{labName\}/g, context.labName ?? 'LNE Bamako');

  return { text, ruleId: rule.ruleId };
}
