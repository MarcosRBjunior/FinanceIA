import type { Metrics } from '../types/api';
import { formatMs, formatPercent, formatUSD } from '../lib/format';

interface MetricCardsProps {
  metrics: Metrics;
}

interface CardDef {
  label: string;
  value: string;
  hint: string;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const cards: CardDef[] = [
    {
      label: 'Acurácia',
      value: metrics.accuracy != null ? formatPercent(metrics.accuracy) : '—',
      hint: 'harness de avaliação (Fase 5)',
    },
    {
      label: 'Resolvido sem LLM',
      value: formatPercent(metrics.resolvedWithoutLlmPct),
      hint: 'cache + regras determinísticas',
    },
    {
      label: 'Latência média',
      value: formatMs(metrics.avgLatencyMs),
      hint: `${metrics.totalClassified} classificações`,
    },
    {
      label: 'Custo estimado',
      value: formatUSD(metrics.estimatedCostUsd),
      hint: 'chamadas ao Claude',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{card.label}</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {card.value}
          </p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}
