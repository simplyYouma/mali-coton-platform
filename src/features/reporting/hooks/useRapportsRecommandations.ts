import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { fetchRapportAnalyseDetail } from '../api/rapportsAnalyse';
import { useRapportsAnalyse } from './useRapportsAnalyse';

export interface RapportRecommandation {
  id: string;
  rapportId: string;
  texte: string;
  siteNom: string;
  siteCode: string;
  mission: string;
  dateEmission: string;
}

/**
 * Recommandations texte libre extraites des rapports d'analyse labo
 * confirmés — lecture seule, non persistées. Partage le cache de
 * `useRapportAnalyseDetail` (même queryKey) pour éviter un double fetch
 * quand un rapport a déjà été ouvert dans la page Rapports.
 */
export function useRapportsRecommandations() {
  const { data: rapports = [], isLoading: rapportsLoading } = useRapportsAnalyse();
  const confirmes = useMemo(() => rapports.filter((r) => r.statut === 'confirme'), [rapports]);

  const detailQueries = useQueries({
    queries: confirmes.map((r) => ({
      queryKey: ['rapports-analyse', r.id],
      queryFn: () => fetchRapportAnalyseDetail(r.id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = rapportsLoading || detailQueries.some((q) => q.isLoading);

  const items = useMemo<RapportRecommandation[]>(() => {
    const out: RapportRecommandation[] = [];
    for (const q of detailQueries) {
      const d = q.data;
      if (!d) continue;
      d.recommandations.forEach((texte, i) => {
        out.push({
          id: `rapport:${d.id}:${i}`,
          rapportId: d.id,
          texte,
          siteNom: d.siteNom,
          siteCode: d.siteCode,
          mission: d.mission,
          dateEmission: d.dateEmission || d.dateEchantillonnage,
        });
      });
    }
    return out;
    // detailQueries est un nouveau tableau à chaque rendu ; on ne dépend
    // que des données réellement utilisées pour éviter une boucle de recalcul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQueries.map((q) => q.dataUpdatedAt).join(',')]);

  return { items, isLoading };
}
