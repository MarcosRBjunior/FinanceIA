import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { classifications, transactions } from '../../db/schema.js';
import { classifyTransaction } from '../../pipeline/orchestrator.js';
import {
  BatchCreateTransactionsSchema,
  CreateTransactionSchema,
  type CreateTransactionInput,
} from '../schemas.js';

function toInsertable(input: CreateTransactionInput): typeof transactions.$inferInsert {
  return { ...input, amount: input.amount.toFixed(2) };
}

export async function transactionsRoutes(app: FastifyInstance) {
  app.post('/transactions', async (request, reply) => {
    const parsed = CreateTransactionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
    }

    const [transaction] = await db.insert(transactions).values(toInsertable(parsed.data)).returning();
    if (!transaction) {
      return reply.status(500).send({ error: 'insert_failed' });
    }

    const classification = await classifyTransaction(transaction);
    const [saved] = await db.insert(classifications).values(classification).returning();

    return reply.status(201).send({ transaction, classification: saved });
  });

  app.post('/transactions/batch', async (request, reply) => {
    const parsed = BatchCreateTransactionsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
    }

    const created = await db
      .insert(transactions)
      .values(parsed.data.transactions.map(toInsertable))
      .returning();

    const concurrency = 5;
    const results: (typeof classifications.$inferInsert)[] = new Array(created.length);
    let cursor = 0;
    async function worker() {
      while (cursor < created.length) {
        const i = cursor++;
        results[i] = await classifyTransaction(created[i]!);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, created.length) }, worker));

    const savedClassifications = await db.insert(classifications).values(results).returning();

    return reply.status(201).send({
      created: created.map((transaction, i) => ({
        transaction,
        classification: savedClassifications[i],
      })),
    });
  });
}
