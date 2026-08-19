import 'dotenv/config';
import { db } from '../db/client.js';
import { classifications, transactions } from '../db/schema.js';
import { getCachedCategory, writeToCache } from './cache.js';
import { classifyWithLlm, LlmClassificationError } from './llm-classifier.js';
import { normalizeDescriptor } from './normalizer.js';
import { applyRules } from './rules.js';

const CONFIDENCE_THRESHOLD = Number(process.env.CONFIDENCE_THRESHOLD ?? 0.8);

type NewClassification = typeof classifications.$inferInsert;

export async function classifyTransaction(
  transaction: { id: number; description: string },
  classify: typeof classifyWithLlm = classifyWithLlm,
): Promise<NewClassification> {
  const normalized = normalizeDescriptor(transaction.description);

  const cached = await getCachedCategory(normalized);
  if (cached) {
    return {
      transactionId: transaction.id,
      category: cached,
      confidence: 1,
      source: 'cache',
      needsReview: false,
    };
  }

  const ruleCategory = applyRules(transaction.description);
  if (ruleCategory) {
    await writeToCache(normalized, ruleCategory);
    return {
      transactionId: transaction.id,
      category: ruleCategory,
      confidence: 1,
      source: 'rules',
      needsReview: false,
    };
  }

  try {
    const llmResult = await classify(transaction.description);
    const needsReview = llmResult.confianca < CONFIDENCE_THRESHOLD;

    if (!needsReview) {
      await writeToCache(normalized, llmResult.categoria);
    }

    return {
      transactionId: transaction.id,
      category: llmResult.categoria,
      confidence: llmResult.confianca,
      source: 'llm',
      reasoning: llmResult.justificativa,
      modelVersion: llmResult.modelVersion,
      latencyMs: llmResult.latencyMs,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
      needsReview,
    };
  } catch (err) {
    if (err instanceof LlmClassificationError) {
      return {
        transactionId: transaction.id,
        category: null,
        confidence: null,
        source: 'llm',
        reasoning: `${err.reason}: ${err.message}`,
        needsReview: true,
      };
    }
    throw err;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await fn(items[current] as T);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function runPipeline(
  concurrency = 5,
  classify: typeof classifyWithLlm = classifyWithLlm,
): Promise<NewClassification[]> {
  const rows = await db
    .select({ id: transactions.id, description: transactions.description })
    .from(transactions);

  const results = await mapWithConcurrency(rows, concurrency, (row) =>
    classifyTransaction(row, classify),
  );

  if (results.length > 0) {
    await db.insert(classifications).values(results);
  }

  return results;
}
