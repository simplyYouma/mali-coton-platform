import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated } from '@/types/common';
import {
  createSite,
  deleteSite,
  fetchSite,
  fetchSiteDetail,
  fetchSites,
  setSiteActif,
  updateSite,
  type SiteInput,
  type SitesQuery,
} from '../api/sites';
import { fetchSitePhotos } from '../api/sitePhotos';
import { fetchSiteEmployes } from '../api/siteEmployes';
import { fetchDonneesEnvironnementales } from '../api/donneesEnv';
import type { Site } from '../api/site.types';

export interface UseSitesOptions extends SitesQuery {
  /**
   * Inclut les sites désactivés. `false` par défaut : c'est le compte qui
   * doit alimenter tableaux de bord, statistiques, carte et listes — un site
   * désactivé sort des agrégats sans que l'appelant ait à y penser. Seuls
   * `SitesListPage` (avec sa bascule) et les écrans qui doivent résoudre le
   * libellé d'un site déjà désactivé (agent affecté, collecte historique…)
   * passent `true` — jamais pour re-proposer ce site comme cible.
   *
   * Filtré côté client : `GET /api/site_teintures` ne documente aucun
   * paramètre `actif` ni aucun filtre serveur. Si l'API en gagne un, le
   * préférer — passer le filtre à `fetchSites()` plutôt que filtrer ici.
   */
  inclureInactifs?: boolean;
}

export function useSites(options: UseSitesOptions = {}) {
  const { inclureInactifs = false, ...query } = options;
  const resultat = useQuery({
    queryKey: ['sites', query],
    queryFn: () => fetchSites(query),
  });

  const data = useMemo(() => {
    if (!resultat.data || inclureInactifs) return resultat.data;
    const items = resultat.data.items.filter((s) => s.actif);
    return { ...resultat.data, items, total: items.length };
  }, [resultat.data, inclureInactifs]);

  return { ...resultat, data };
}

export function useSite(id: string | undefined) {
  return useQuery({
    queryKey: ['sites', id],
    queryFn: () => fetchSite(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useSiteDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['siteDetail', id],
    queryFn: () => fetchSiteDetail(id ?? ''),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useSiteEmployes(id: string | undefined) {
  return useQuery({
    queryKey: ['siteEmployes', id],
    queryFn: () => fetchSiteEmployes(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useSitePhotos(collecteSiteId: number | null | undefined) {
  return useQuery({
    queryKey: ['sitePhotos', collecteSiteId],
    queryFn: () => fetchSitePhotos(collecteSiteId!),
    enabled: collecteSiteId != null && collecteSiteId > 0,
    staleTime: 60_000,
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SiteInput) => createSite(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
    },
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SiteInput> }) =>
      updateSite(id, patch),
    onSuccess: (site) => {
      // `['sites']` invalide aussi `['sites', id]` par préfixe ; `siteDetail`
      // est une clé racine distincte, jamais couverte par ce préfixe.
      qc.invalidateQueries({ queryKey: ['sites'] });
      qc.invalidateQueries({ queryKey: ['siteDetail', site.id] });
      qc.setQueryData(['sites', site.id], site);
    },
  });
}

interface ContexteBasculeActif {
  previousSite?: Site;
  previousListe?: Paginated<Site>;
}

/**
 * Active/désactive un site — réservé côté UI à qui détient le droit adéquat
 * (voir `SiteCard`/`SiteDetailPage`, jamais déduit d'un nom de rôle).
 *
 * Bascule optimiste : le badge change avant la réponse serveur (`onMutate`),
 * avec retour arrière visible si la requête échoue (`onError`) — l'action
 * doit se sentir immédiate sur le terrain, pas geler l'écran en attendant
 * un aller-retour réseau.
 */
export function useSetSiteActif() {
  const qc = useQueryClient();
  return useMutation<Site, Error, { id: string; actif: boolean }, ContexteBasculeActif>({
    mutationFn: ({ id, actif }) => setSiteActif(id, actif),
    onMutate: async ({ id, actif }) => {
      await qc.cancelQueries({ queryKey: ['sites'] });
      const previousSite = qc.getQueryData<Site>(['sites', id]);
      const previousListe = qc.getQueryData<Paginated<Site>>(['sites', {}]);
      if (previousSite) qc.setQueryData(['sites', id], { ...previousSite, actif });
      if (previousListe) {
        qc.setQueryData(['sites', {}], {
          ...previousListe,
          items: previousListe.items.map((s) => (s.id === id ? { ...s, actif } : s)),
        });
      }
      return { previousSite, previousListe };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousSite) qc.setQueryData(['sites', id], context.previousSite);
      if (context?.previousListe) qc.setQueryData(['sites', {}], context.previousListe);
    },
    onSuccess: (site) => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      qc.invalidateQueries({ queryKey: ['siteDetail', site.id] });
      qc.setQueryData(['sites', site.id], site);
    },
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSite(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      qc.invalidateQueries({ queryKey: ['siteDetail', id] });
      qc.removeQueries({ queryKey: ['sites', id] });
    },
  });
}

export function useDonneesEnvironnementales(siteId: string | undefined) {
  return useQuery({
    queryKey: ['donneesEnv', siteId],
    queryFn: () => fetchDonneesEnvironnementales(siteId!),
    enabled: Boolean(siteId),
    staleTime: 60_000,
  });
}
