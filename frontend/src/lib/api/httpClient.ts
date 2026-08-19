import type {
  ClassificationWithTransaction,
  CreateTransactionInput,
  CreateTransactionResult,
  Metrics,
  PatchClassificationInput,
} from '../../types/api';
import type { ApiClient } from './client';

interface ApiErrorBody {
  error?: string;
  details?: unknown;
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
    createTransaction(input: CreateTransactionInput) {
      return request<CreateTransactionResult>('/transactions', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async createTransactionsBatch(inputs: CreateTransactionInput[]) {
      const { created } = await request<{ created: CreateTransactionResult[] }>(
        '/transactions/batch',
        {
          method: 'POST',
          body: JSON.stringify({ transactions: inputs }),
        },
      );
      return created;
    },
    listClassificationsNeedingReview() {
      return request<ClassificationWithTransaction[]>('/classifications?needs_review=true');
    },
    patchClassification(id: string, input: PatchClassificationInput) {
      return request<ClassificationWithTransaction>(`/classifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },
    getMetrics() {
      return request<Metrics>('/metrics');
    },
  };
}
