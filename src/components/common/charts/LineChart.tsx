import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartDataset, ChartOptions } from 'chart.js';
import { lineChartDefaults, resolvePaletteColor } from './chartTheme';

export interface LineSeries {
  label: string;
  values: Array<number | null>;
}

export interface LineChartProps {
  labels: string[];
  series: LineSeries[];
  /** Hauteur fixe en px (Chart.js exige une hauteur explicite). */
  height?: number;
  /** Trace une ligne pointillée pour visualiser un seuil OMS. */
  threshold?: { value: number; label: string };
  /** Active un dégradé subtil sous chaque ligne (style éditorial). */
  fillArea?: boolean;
  /** Surcharge spécifique pour des cas non couverts par les défauts. */
  options?: ChartOptions<'line'>;
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return `rgba(65, 143, 222, ${alpha})`;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function LineChart({
  labels,
  series,
  height = 240,
  threshold,
  fillArea = false,
  options,
}: LineChartProps) {
  const data = useMemo<ChartData<'line'>>(() => {
    const datasets: ChartDataset<'line'>[] = series.map((s, idx) => {
      const color = resolvePaletteColor(idx);
      return {
        label: s.label,
        data: s.values,
        borderColor: color,
        backgroundColor: fillArea ? hexToRgba(color, 0.08) : color,
        fill: fillArea ? 'origin' : false,
        spanGaps: true,
      };
    });
    if (threshold) {
      datasets.push({
        label: threshold.label,
        data: labels.map(() => threshold.value),
        borderColor: 'rgba(185, 28, 28, 0.7)',
        backgroundColor: 'rgba(185, 28, 28, 0.05)',
        borderDash: [6, 6],
        spanGaps: true,
      });
    }
    return { labels, datasets };
  }, [labels, series, threshold]);

  const merged: ChartOptions<'line'> = useMemo(
    () => ({ ...lineChartDefaults(), ...(options ?? {}) }),
    [options],
  );

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <Line data={data} options={merged} />
    </div>
  );
}
