/**
 * Spécifications des templates de rapport — 3 livrables prédéfinis :
 * rapport mensuel, rapport trimestriel, rapport final consolidé.
 */

export type ReportTemplateId = 'monthly' | 'quarterly' | 'final';

export type ReportSectionId =
  | 'cover'
  | 'executive'
  | 'kpis'
  | 'domains'
  | 'exceedances'
  | 'alerts'
  | 'lab'
  | 'silences'
  | 'baseline'
  | 'recommendations'
  | 'legal'
  | 'appendix';

export interface ReportTemplate {
  id: ReportTemplateId;
  title: string;
  cadenceLabel: string;
  audience: string;
  description: string;
  sections: ReportSectionId[];
  /** Nombre approximatif de pages — pour affichage uniquement. */
  approxPages: number;
}

export const REPORT_TEMPLATES: Record<ReportTemplateId, ReportTemplate> = {
  monthly: {
    id: 'monthly',
    title: 'Bilan mensuel',
    cadenceLabel: 'Mensuel',
    audience: 'Superviseurs · PNUD',
    description:
      "Synthèse des collectes et alertes du mois écoulé : conformité par domaine, top dépassements, suivi laboratoire. Document opérationnel destiné au pilotage interne.",
    sections: ['cover', 'executive', 'kpis', 'domains', 'exceedances', 'alerts', 'lab', 'silences', 'appendix'],
    approxPages: 8,
  },
  quarterly: {
    id: 'quarterly',
    title: 'Rapport trimestriel',
    cadenceLabel: 'Trimestriel',
    audience: 'Comité de pilotage · PNUD',
    description:
      "Livrable contractuel destiné au comité de pilotage. Tendances inter-sites, indice composite, comparatif aux périodes précédentes, recommandations.",
    sections: ['cover', 'executive', 'kpis', 'domains', 'exceedances', 'alerts', 'lab', 'silences', 'recommendations', 'legal', 'appendix'],
    approxPages: 18,
  },
  final: {
    id: 'final',
    title: 'Rapport final consolidé',
    cadenceLabel: 'Final',
    audience: 'PNUD · Ministère de l\'Environnement',
    description:
      "Livrable final de la mission : bilan socio-environnemental complet, comparaison aux valeurs de référence du Diagnostic 2025, conformité légale, leçons apprises.",
    sections: [
      'cover',
      'executive',
      'kpis',
      'domains',
      'baseline',
      'exceedances',
      'alerts',
      'lab',
      'silences',
      'recommendations',
      'legal',
      'appendix',
    ],
    approxPages: 38,
  },
};

export function templateById(id: ReportTemplateId): ReportTemplate {
  return REPORT_TEMPLATES[id];
}

/**
 * Calcule la période par défaut selon le template, ancrée sur aujourd'hui.
 *
 *  - Mensuel    : du 1er du mois courant à aujourd'hui (mois en cours).
 *  - Trimestriel: du 1er jour du trimestre courant à aujourd'hui (trimestre en cours).
 *  - Final      : depuis le début de la mission (janvier 2026) jusqu'à aujourd'hui.
 */
export function defaultPeriod(template: ReportTemplateId): { from: string; to: string } {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let from: Date;
  if (template === 'monthly') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (template === 'quarterly') {
    const startMonth = Math.floor(now.getMonth() / 3) * 3;
    from = new Date(now.getFullYear(), startMonth, 1);
  } else {
    // final : depuis le début de la mission (janvier 2026)
    from = new Date(2026, 0, 1);
  }
  return { from: from.toISOString(), to: endOfToday.toISOString() };
}

export function periodLabel(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  const sameMonth = f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear();
  if (sameMonth) {
    return f.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  return `${f.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → ${t.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}
