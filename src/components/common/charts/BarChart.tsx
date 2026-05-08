import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { barChartDefaults, resolvePaletteColor } from './chartTheme';

export interface BarChartProps {
  labels: string[];
  values: number[];
  /** Couleurs par bar (aligné sur labels). Sinon palette par défaut. */
  colors?: string[];
  height?: number;
  unit?: string;
  options?: ChartOptions<'bar'>;
}

export function BarChart({
  labels,
  values,
  colors,
  height = 240,
  unit,
  options,
}: BarChartProps) {
  const data = useMemo<ChartData<'bar'>>(
    () => ({
      labels,
      datasets: [
        {
          label: unit ?? '',
          data: values,
          backgroundColor: colors ?? values.map((_, idx) => resolvePaletteColor(idx)),
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 36,
        },
      ],
    }),
    [labels, values, colors, unit],
  );

  const merged: ChartOptions<'bar'> = useMemo(
    () => ({ ...barChartDefaults(), ...(options ?? {}) }),
    [options],
  );

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <Bar data={data} options={merged} />
    </div>
  );
}
