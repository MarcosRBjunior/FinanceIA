import type {
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
  patchClassification(
    id: string,
    input: PatchClassificationInput,
  ): Promise<ClassificationWithTransaction>;
  getMetrics(): Promise<Metrics>;
}
