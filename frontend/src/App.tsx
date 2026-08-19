import { useCallback, useEffect, useMemo, useState } from 'react';
import { createApiClient } from './lib/api';
import type { Category, ClassificationWithTransaction, Metrics } from './types/api';
import { MetricCards } from './components/MetricCards';
import { CategorySpendingChart } from './components/CategorySpendingChart';
import { ReviewQueue } from './components/ReviewQueue';

function App() {
  const api = useMemo(() => createApiClient(), []);

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ClassificationWithTransaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [metricsResult, queueResult] = await Promise.all([
        api.getMetrics(),
        api.listClassificationsNeedingReview(),
      ]);
      setMetrics(metricsResult);
      setReviewQueue(queueResult);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar dados.');
    }
  }, [api]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCorrect = useCallback(
    async (id: string, category: Category) => {
      await api.patchClassification(id, { category });
      setReviewQueue((prev) => (prev ? prev.filter((item) => item.id !== id) : prev));
      const metricsResult = await api.getMetrics();
      setMetrics(metricsResult);
    },
    [api],
  );

  const isLoading = metrics === null || reviewQueue === null;

  return (
    <div className="min-h-svh bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Classificador de Transações
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Pipeline híbrido de categorização — cache, regras e LLM
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {isLoading && !error ? (
          <p className="text-sm text-neutral-400">Carregando…</p>
        ) : (
          metrics &&
          reviewQueue && (
            <>
              <MetricCards metrics={metrics} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <CategorySpendingChart data={metrics.spendingByCategory} />
                <ReviewQueue items={reviewQueue} onCorrect={handleCorrect} />
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}

export default App;
