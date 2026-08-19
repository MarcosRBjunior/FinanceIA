import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SpendingByCategory } from '../types/api';
import { formatBRL } from '../lib/format';

interface CategorySpendingChartProps {
  data: SpendingByCategory;
}

interface ChartEntry {
  category: string;
  totalAmount: number;
}

export function CategorySpendingChart({ data }: CategorySpendingChartProps) {
  const sorted: ChartEntry[] = Object.entries(data)
    .map(([category, totalAmount]) => ({ category, totalAmount: totalAmount ?? 0 }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
        Gastos por categoria
      </h2>
      {sorted.length === 0 ? (
        <p className="mt-8 mb-8 text-center text-sm text-neutral-400">Sem dados ainda.</p>
      ) : (
        <div className="mt-4 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                className="stroke-neutral-200 dark:stroke-neutral-800"
              />
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatBRL(v)}
                tick={{ fontSize: 12 }}
              />
              <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatBRL(Number(value))} />
              <Bar dataKey="totalAmount" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
