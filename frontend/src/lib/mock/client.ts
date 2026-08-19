import type {
  Classification,
  ClassificationWithTransaction,
  CreateTransactionInput,
  CreateTransactionResult,
  Metrics,
} from '../../types/api';
import { CATEGORIES } from '../../types/api';
import type { ApiClient } from '../api/client';
import { getMockRows, makeSeededRow, toWithTransaction } from './data';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CLAUDE_COST_PER_1K_INPUT = 0.003;
const CLAUDE_COST_PER_1K_OUTPUT = 0.015;

/** Pipeline fake pra classificação de uma transação nova via mock (não é o pipeline real). */
function fakeClassify(
  input: CreateTransactionInput,
): Omit<Classification, 'id' | 'transactionId' | 'createdAt'> {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]!;
  const confidence = 0.55 + Math.random() * 0.44;
  return {
    category,
    confidence: Math.round(confidence * 100) / 100,
    source: 'llm',
    reasoning: `Descritor "${input.description}" classificado por similaridade semântica.`,
    modelVersion: 'claude-sonnet-5',
    latencyMs: 400 + Math.round(Math.random() * 900),
    inputTokens: 300 + Math.round(Math.random() * 100),
    outputTokens: 30 + Math.round(Math.random() * 30),
    needsReview: confidence < 0.8,
    reviewedAt: null,
  };
}

/**
 * Implementação em memória do ApiClient, seguindo o contrato da seção 6 do spec.
 * Serve pra desenvolver a UI sem depender da API real (ainda não implementada
 * na Fase 6). Troque `createApiClient()` em src/lib/api/index.ts quando ela existir.
 */
export function createMockApiClient(): ApiClient {
  return {
    async createTransaction(input): Promise<CreateTransactionResult> {
      await delay(300);
      const row = makeSeededRow(input, fakeClassify(input));
      getMockRows().push(row);
      return { transaction: row.transaction, classification: row.classification };
    },

    async createTransactionsBatch(inputs): Promise<CreateTransactionResult[]> {
      await delay(300 + inputs.length * 20);
      return inputs.map((input) => {
        const row = makeSeededRow(input, fakeClassify(input));
        getMockRows().push(row);
        return { transaction: row.transaction, classification: row.classification };
      });
    },

    async listClassificationsNeedingReview(): Promise<ClassificationWithTransaction[]> {
      await delay(200);
      return getMockRows()
        .filter((row) => row.classification.needsReview)
        .map(toWithTransaction)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async patchClassification(id, input): Promise<ClassificationWithTransaction> {
      await delay(200);
      const row = getMockRows().find((r) => r.classification.id === id);
      if (!row) {
        throw new Error(`Classificação ${id} não encontrada`);
      }
      row.classification = {
        ...row.classification,
        category: input.category,
        source: 'human',
        needsReview: false,
        reviewedAt: new Date().toISOString(),
      };
      return toWithTransaction(row);
    },

    async getMetrics(): Promise<Metrics> {
      await delay(250);
      const rows = getMockRows();
      const total = rows.length;
      const sourceBreakdown: Metrics['sourceBreakdown'] = {
        cache: 0,
        rules: 0,
        llm: 0,
        human: 0,
      };
      let latencySum = 0;
      let latencyCount = 0;
      let inputTokens = 0;
      let outputTokens = 0;

      for (const row of rows) {
        sourceBreakdown[row.classification.source] += 1;
        if (row.classification.latencyMs != null) {
          latencySum += row.classification.latencyMs;
          latencyCount += 1;
        }
        inputTokens += row.classification.inputTokens ?? 0;
        outputTokens += row.classification.outputTokens ?? 0;
      }

      const resolvedWithoutLlm = sourceBreakdown.cache + sourceBreakdown.rules;
      const spendingByCategory: Metrics['spendingByCategory'] = {};
      for (const category of CATEGORIES) {
        const categoryTotal = rows
          .filter(
            (row) => row.classification.category === category && row.transaction.type === 'debit',
          )
          .reduce((sum, row) => sum + Math.abs(row.transaction.amount), 0);
        if (categoryTotal > 0) {
          spendingByCategory[category] = categoryTotal;
        }
      }

      return {
        // null até a Fase 5 (harness de avaliação) importar eval_labels — mesmo
        // comportamento da API real hoje.
        accuracy: null,
        totalClassified: total,
        resolvedWithoutLlmPct: total > 0 ? resolvedWithoutLlm / total : 0,
        avgLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
        estimatedCostUsd:
          (inputTokens / 1000) * CLAUDE_COST_PER_1K_INPUT +
          (outputTokens / 1000) * CLAUDE_COST_PER_1K_OUTPUT,
        sourceBreakdown,
        spendingByCategory,
      };
    },
  };
}
