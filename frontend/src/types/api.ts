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
  category: Category;
  confidence: number;
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

export interface SpendingByCategory {
  category: Category;
  totalAmount: number;
}

/**
 * Contrato provisório enquanto a Fase 5/6 do backend não existe.
 * Cobre os quatro números do spec (acurácia, % sem LLM, latência média, custo)
 * mais o que os cards e o gráfico do dashboard precisam para renderizar.
 */
export interface Metrics {
  accuracy: number | null;
  totalClassified: number;
  resolvedWithoutLlmPct: number;
  avgLatencyMs: number;
  estimatedCostUsd: number;
  sourceBreakdown: Record<ClassificationSource, number>;
  spendingByCategory: SpendingByCategory[];
}
