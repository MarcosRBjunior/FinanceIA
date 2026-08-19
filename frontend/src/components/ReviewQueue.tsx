import { useState } from 'react';
import type { Category, ClassificationWithTransaction } from '../types/api';
import { CATEGORIES } from '../types/api';
import { formatBRL, formatPercent } from '../lib/format';

interface ReviewQueueProps {
  items: ClassificationWithTransaction[];
  onCorrect: (id: string, category: Category) => Promise<void>;
}

export function ReviewQueue({ items, onCorrect }: ReviewQueueProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, Category>>({});

  async function handleSave(item: ClassificationWithTransaction) {
    const category = selected[item.id] ?? item.category ?? 'Outros';
    setPendingId(item.id);
    try {
      await onCorrect(item.id, category);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Fila de revisão
        </h2>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          {items.length} pendente{items.length === 1 ? '' : 's'}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-8 mb-8 text-center text-sm text-neutral-400">
          Nada pendente de revisão. 🎉
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {item.transaction.description}
                </p>
                <p className="text-xs text-neutral-400">
                  {formatBRL(item.transaction.amount)} · sugestão:{' '}
                  {item.category ?? 'não classificado (falha do LLM)'}
                  {item.confidence != null && ` (${formatPercent(item.confidence)})`}
                </p>
              </div>

              <select
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                value={selected[item.id] ?? item.category ?? 'Outros'}
                onChange={(e) =>
                  setSelected((prev) => ({ ...prev, [item.id]: e.target.value as Category }))
                }
                disabled={pendingId === item.id}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void handleSave(item)}
                disabled={pendingId === item.id}
                className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {pendingId === item.id ? 'Salvando…' : 'Corrigir'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
