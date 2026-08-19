export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// For values already on a 0-100 scale (e.g. metrics.accuracy, resolvedWithoutLlmPct),
// as opposed to formatPercent's 0-1 fraction (e.g. classification confidence).
export function formatPercentValue(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatMs(value: number): string {
  return `${value.toLocaleString('pt-BR')} ms`;
}
