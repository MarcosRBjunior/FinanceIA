import type {
  Classification,
  ClassificationWithTransaction,
  CreateTransactionInput,
  Metrics,
  PatchClassificationInput,
  Transaction,
} from '../../types/api';
import type { ApiClient } from './client';

interface ApiErrorBody {
  error?: string;
  details?: unknown;
}

// O backend usa `serial` (number) como id e `numeric` (string, precisão exata)
// para amount; a UI trabalha com id/amount normalizados como definidos em types/api.ts.
type RawTransaction = Omit<Transaction, 'id' | 'amount'> & { id: number; amount: string };
type RawClassification = Omit<Classification, 'id' | 'transactionId'> & {
  id: number;
  transactionId: number;
};
type RawClassificationWithTransaction = RawClassification & { transaction: RawTransaction };

function mapTransaction(raw: RawTransaction): Transaction {
  return { ...raw, id: String(raw.id), amount: Number(raw.amount) };
}

function mapClassification(raw: RawClassification): Classification {
  return { ...raw, id: String(raw.id), transactionId: String(raw.transactionId) };
}

function mapClassificationWithTransaction(
  raw: RawClassificationWithTransaction,
): ClassificationWithTransaction {
  return { ...mapClassification(raw), transaction: mapTransaction(raw.transaction) };
}

/** Implementação real contra a API REST da Fase 6, confirmada contra o backend. */
export function createHttpApiClient(baseUrl: string): ApiClient {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
      const detail = body?.error ? `: ${body.error}` : '';
      throw new Error(
        `${init?.method ?? 'GET'} ${path} falhou (${res.status})${detail}`,
      );
    }
    return (await res.json()) as T;
  }

  return {
    async createTransaction(input: CreateTransactionInput) {
      const { transaction, classification } = await request<{
        transaction: RawTransaction;
        classification: RawClassification;
      }>('/transactions', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return { transaction: mapTransaction(transaction), classification: mapClassification(classification) };
    },
    async createTransactionsBatch(inputs: CreateTransactionInput[]) {
      const { created } = await request<{
        created: { transaction: RawTransaction; classification: RawClassification }[];
      }>('/transactions/batch', {
        method: 'POST',
        body: JSON.stringify({ transactions: inputs }),
      });
      return created.map(({ transaction, classification }) => ({
        transaction: mapTransaction(transaction),
        classification: mapClassification(classification),
      }));
    },
    async listClassificationsNeedingReview() {
      const rows = await request<RawClassificationWithTransaction[]>(
        '/classifications?needs_review=true',
      );
      return rows.map(mapClassificationWithTransaction);
    },
    async patchClassification(id: string, input: PatchClassificationInput) {
      const row = await request<RawClassification>(`/classifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
      return mapClassification(row);
    },
    getMetrics() {
      return request<Metrics>('/metrics');
    },
  };
}
