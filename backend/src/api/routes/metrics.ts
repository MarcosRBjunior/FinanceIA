import { desc } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { classifications, evalLabels, transactions } from '../../db/schema.js';

const PRICE_PER_MILLION_INPUT = 3;
const PRICE_PER_MILLION_OUTPUT = 15;

export async function metricsRoutes(app: FastifyInstance) {
  app.get('/metrics', async (_request, reply) => {
    const allClassifications = await db
      .select()
      .from(classifications)
      .orderBy(desc(classifications.id));

    const latestByTransaction = new Map<number, (typeof allClassifications)[number]>();
    for (const c of allClassifications) {
      if (!latestByTransaction.has(c.transactionId)) {
        latestByTransaction.set(c.transactionId, c);
      }
    }

    const sourceBreakdown: Record<string, number> = { cache: 0, rules: 0, llm: 0, human: 0 };
    let totalLatency = 0;
    let latencyCount = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const c of latestByTransaction.values()) {
      sourceBreakdown[c.source] = (sourceBreakdown[c.source] ?? 0) + 1;
      if (c.latencyMs != null) {
        totalLatency += c.latencyMs;
        latencyCount++;
      }
      totalInputTokens += c.inputTokens ?? 0;
      totalOutputTokens += c.outputTokens ?? 0;
    }

    const totalClassified = latestByTransaction.size;
    const resolvedWithoutLlm = totalClassified - (sourceBreakdown.llm ?? 0);
    const resolvedWithoutLlmPct =
      totalClassified > 0 ? (resolvedWithoutLlm / totalClassified) * 100 : 0;
    const estimatedCostUsd =
      (totalInputTokens / 1_000_000) * PRICE_PER_MILLION_INPUT +
      (totalOutputTokens / 1_000_000) * PRICE_PER_MILLION_OUTPUT;

    const labels = await db.select().from(evalLabels);
    let accuracy: number | null = null;
    if (labels.length > 0) {
      let correct = 0;
      for (const label of labels) {
        const prediction = latestByTransaction.get(label.transactionId);
        if (prediction?.category === label.expectedCategory) correct++;
      }
      accuracy = (correct / labels.length) * 100;
    }

    const allTransactions = await db.select().from(transactions);
    const txById = new Map(allTransactions.map((t) => [t.id, t]));
    const spendingByCategory: Record<string, number> = {};
    for (const c of latestByTransaction.values()) {
      if (!c.category) continue;
      const tx = txById.get(c.transactionId);
      if (!tx || tx.type !== 'debit') continue;
      spendingByCategory[c.category] = (spendingByCategory[c.category] ?? 0) + Number(tx.amount);
    }

    return reply.send({
      accuracy,
      totalClassified,
      resolvedWithoutLlmPct,
      avgLatencyMs: latencyCount > 0 ? totalLatency / latencyCount : null,
      estimatedCostUsd,
      sourceBreakdown,
      spendingByCategory,
    });
  });
}
