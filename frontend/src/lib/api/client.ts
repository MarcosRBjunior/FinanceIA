import type {
  Classification,
  ClassificationWithTransaction,
  CreateTransactionInput,
  CreateTransactionResult,
  Metrics,
  PatchClassificationInput,
} from '../../types/api';

/**
 * Contrato que a UI conversa. Trocar de mock para API real é trocar só
 * a implementação injetada aqui — nenhum componente importa fetch/mock diretamente.
 */
export interface ApiClient {
  createTransaction(input: CreateTransactionInput): Promise<CreateTransactionResult>;
  createTransactionsBatch(inputs: CreateTransactionInput[]): Promise<CreateTransactionResult[]>;
  listClassificationsNeedingReview(): Promise<ClassificationWithTransaction[]>;
  // PATCH /classifications/:id não faz join com transactions no backend — retorna só a classification.
  patchClassification(id: string, input: PatchClassificationInput): Promise<Classification>;
  getMetrics(): Promise<Metrics>;
}
