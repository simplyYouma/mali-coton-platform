/**
 * Thème Chart.js global — alimenté par les tokens CSS de la plateforme.
 * Single source of truth pour les graphiques (Yumi Standard §21).
 *
 * À importer une fois dans App.tsx avant tout rendu de chart pour enregistrer
 * les éléments Chart.js et appliquer le thème par défaut.
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';

/**
 * Enregistrement Chart.js — exécuté à l'import du module (side-effect).
 * Indispensable AVANT le premier render d'un <Line>/<Bar>, sinon
 * "category is not a registered scale".
 */
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

let themeApplied = false;

/**
 * Applique les defaults issus des tokens CSS. Idempotent — peut être appelé
 * plusieurs fois (StrictMode double-mount), seule la première fois s'exécute.
 */
export function registerChartTheme(): void {
  if (themeApplied) return;
  themeApplied = true;

  const root = typeof document !== 'undefined' ? document.documentElement : null;
  const cssVar = (name: string, fallback: string): string => {
    if (!root) return fallback;
    const value = getComputedStyle(root).getPropertyValue(name).trim();
    return value || fallback;
  };

  ChartJS.defaults.font.family = cssVar('--font-sans', 'Inter, system-ui, sans-serif');
  ChartJS.defaults.font.size = 12;
  ChartJS.defaults.color = cssVar('--color-text-muted', '#5a6360');
  ChartJS.defaults.borderColor = cssVar('--color-border', '#e3eaf1');
  ChartJS.defaults.plugins.legend.labels.boxWidth = 10;
  ChartJS.defaults.plugins.legend.labels.boxHeight = 10;
  ChartJS.defaults.plugins.legend.labels.padding = 16;
  ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
  ChartJS.defaults.plugins.tooltip.backgroundColor = cssVar('--color-text', '#0e1413');
  ChartJS.defaults.plugins.tooltip.titleColor = '#fff';
  ChartJS.defaults.plugins.tooltip.bodyColor = '#fff';
  ChartJS.defaults.plugins.tooltip.padding = 10;
  ChartJS.defaults.plugins.tooltip.cornerRadius = 8;
  ChartJS.defaults.plugins.tooltip.displayColors = true;
  ChartJS.defaults.plugins.tooltip.boxPadding = 4;
}

// Applique le thème dès que le DOM est dispo (immédiat en SPA Vite).
if (typeof document !== 'undefined') {
  registerChartTheme();
}

/**
 * Palette qualitative colorblind-safe (CDC §3.2 + tech-spec §2 charts).
 */
export const CHART_PALETTE: string[] = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
];

export function resolvePaletteColor(index: number): string {
  if (typeof document === 'undefined') return '#4a7fa7';
  const root = document.documentElement;
  const idx = (index % 6) + 1;
  const value = getComputedStyle(root).getPropertyValue(`--chart-${idx}`).trim();
  return value || '#4a7fa7';
}

/**
 * Options par défaut pour un line chart de tendance.
 */
export function lineChartDefaults(): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { position: 'bottom' },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 0 },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        beginAtZero: false,
      },
    },
    elements: {
      line: { tension: 0.32, borderWidth: 2 },
      point: { radius: 0, hoverRadius: 5 },
    },
  };
}

/**
 * Options par défaut pour un bar chart comparatif.
 */
export function barChartDefaults(): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
    },
  };
}
