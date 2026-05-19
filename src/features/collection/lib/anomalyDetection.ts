/**
 * Détection de valeurs aberrantes vs historique d'un site (Phase C5).
 *
 * Compare une valeur à la distribution historique du même indicateur sur le
 * même site. Si la valeur s'éloigne significativement (>= 3 fois l'écart-type
 * du robust z-score basé sur la MAD), elle est signalée comme aberrante.
 *
 * Pas de magie : pure stats, déterministe, expliquable.
 */
import type { Collection } from '../api/collection.types';

export interface Anomaly {
  collectionId: string;
  indicatorId: string;
  value: number;
  median: number;
  /** Rapport |valeur - médiane| / MAD (robust z-score). */
  zRobust: number;
  level: 'mild' | 'severe';
}

/** Médiane d'un tableau de nombres. */
function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/** MAD (Median Absolute Deviation) — alternative robuste à l'écart-type. */
function mad(values: number[], med: number): number {
  if (values.length === 0) return 0;
  return median(values.map((v) => Math.abs(v - med)));
}

/**
 * Pour chaque mesure de la collecte cible, regarde l'historique du même
 * couple (siteId, indicatorId) sur les collectes validated ou lab_complete
 * et signale les valeurs aberrantes.
 *
 * Seuils :
 *   - z_robust >= 3.5  → 'severe' (très inhabituel)
 *   - z_robust >= 2.5  → 'mild' (à surveiller)
 *
 * Requiert au moins 4 valeurs historiques pour calculer (sinon on n'a pas
 * assez de données pour juger).
 */
export function detectAnomalies(
  target: Collection,
  allCollections: Collection[],
): Anomaly[] {
  const out: Anomaly[] = [];
  // Collectes historiques du même site, validées (référence stable)
  const history = allCollections.filter(
    (c) =>
      c.id !== target.id &&
      c.siteId === target.siteId &&
      (c.status === 'validated' || c.status === 'lab_complete'),
  );
  if (history.length < 4) return out;

  for (const m of target.measurements) {
    if (m.value == null || m.value === '') continue;
    const num = typeof m.value === 'number' ? m.value : Number(m.value);
    if (!Number.isFinite(num)) continue;

    const histValues: number[] = [];
    for (const h of history) {
      const hm = h.measurements.find((x) => x.indicatorId === m.indicatorId);
      if (!hm || hm.value == null || hm.value === '') continue;
      const hn = typeof hm.value === 'number' ? hm.value : Number(hm.value);
      if (Number.isFinite(hn)) histValues.push(hn);
    }
    if (histValues.length < 4) continue;

    const med = median(histValues);
    const dev = mad(histValues, med);
    // Si MAD = 0 (historique parfaitement plat), on se rabat sur 5% de la médiane
    const denom = dev > 0 ? dev * 1.4826 : Math.max(Math.abs(med) * 0.05, 0.01);
    const z = Math.abs(num - med) / denom;

    if (z >= 3.5) {
      out.push({
        collectionId: target.id,
        indicatorId: m.indicatorId,
        value: num,
        median: med,
        zRobust: z,
        level: 'severe',
      });
    } else if (z >= 2.5) {
      out.push({
        collectionId: target.id,
        indicatorId: m.indicatorId,
        value: num,
        median: med,
        zRobust: z,
        level: 'mild',
      });
    }
  }

  return out;
}
