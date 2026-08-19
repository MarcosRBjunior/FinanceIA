export const CATEGORIES = [
  'Alimentação',
  'Mercado',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Vestuário',
  'Serviços',
  'Transferências',
  'Renda',
  'Taxas e Tarifas',
  'Outros',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type TransactionType = 'debit' | 'credit';

export type ClassificationSource = 'cache' | 'rules' | 'llm' | 'human';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  transactionDate: string;
  type: TransactionType;
  createdAt: string;
}

export interface Classification {
  id: string;
  transactionId: string;
  // null quando o LLM falha totalmente (não só quando a confiança é baixa).
  category: Category | null;
  confidence: number | null;
  source: ClassificationSource;
  reasoning: string | null;
  modelVersion: string | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  needsReview: boolean;
  reviewedAt: string | null;
  createdAt: string;
}

/**
 * Classificação com a transação embutida — formato usado na fila de revisão,
 * onde a UI precisa mostrar descrição/valor junto da categoria sugerida.
 */
export interface ClassificationWithTransaction extends Classification {
  transaction: Transaction;
}

export interface CreateTransactionInput {
  description: string;
  amount: number;
  transactionDate: string;
  type: TransactionType;
}

export interface CreateTransactionResult {
  transaction: Transaction;
  classification: Classification;
}

export interface PatchClassificationInput {
  category: Category;
}

/** Mapa categoria → total gasto (só soma transações type=debit). Categorias sem gasto ficam de fora. */
export type SpendingByCategory = Partial<Record<Category, number>>;

/** Contrato real da Fase 6 do backend, confirmado contra a implementação. */
export interface Metrics {
  accuracy: number | null;
  totalClassified: number;
  resolvedWithoutLlmPct: number;
  avgLatencyMs: number;
  estimatedCostUsd: number;
  sourceBreakdown: Record<ClassificationSource, number>;
  spendingByCategory: SpendingByCategory;
}
