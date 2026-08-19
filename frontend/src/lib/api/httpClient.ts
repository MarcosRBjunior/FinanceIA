import type {
  ClassificationWithTransaction,
  CreateTransactionInput,
  CreateTransactionResult,
  Metrics,
  PatchClassificationInput,
} from '../../types/api';
import type { ApiClient } from './client';

/**
 * Implementação real contra a API REST da Fase 6 do spec. Ainda não foi
 * exercitada contra o backend de verdade — os endpoints e formatos aqui
 * seguem o contrato passado por mensagem, e podem precisar de ajuste fino
 * quando a Fase 6 estiver pronta (nomes de campos, envelope de resposta, etc).
 */
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
      throw new Error(`${init?.method ?? 'GET'} ${path} falhou: ${res.status} ${res.statusText}`);
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
    createTransactionsBatch(inputs: CreateTransactionInput[]) {
      return request<CreateTransactionResult[]>('/transactions/batch', {
        method: 'POST',
        body: JSON.stringify(inputs),
      });
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
