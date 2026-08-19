import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { classifications, transactions } from '../../db/schema.js';
import { writeToCache } from '../../pipeline/cache.js';
import { normalizeDescriptor } from '../../pipeline/normalizer.js';
import { PatchClassificationSchema } from '../schemas.js';

export async function classificationsRoutes(app: FastifyInstance) {
  app.get('/classifications', async (request, reply) => {
    const query = request.query as { needs_review?: string };

    const rows = await db
      .select({ classification: classifications, transaction: transactions })
      .from(classifications)
      .innerJoin(transactions, eq(classifications.transactionId, transactions.id))
      .where(
        query.needs_review === undefined
          ? undefined
          : eq(classifications.needsReview, query.needs_review === 'true'),
      );

    return reply.send(
      rows.map((r) => ({
        ...r.classification,
        transaction: r.transaction,
      })),
    );
  });

  app.patch('/classifications/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      return reply.status(400).send({ error: 'invalid_id' });
    }

    const parsed = PatchClassificationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
    }

    const [existing] = await db
      .select({ classification: classifications, transaction: transactions })
      .from(classifications)
      .innerJoin(transactions, eq(classifications.transactionId, transactions.id))
      .where(eq(classifications.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: 'not_found' });
    }

    const [updated] = await db
      .update(classifications)
      .set({
        category: parsed.data.category,
        confidence: 1,
        source: 'human',
        needsReview: false,
        reviewedAt: new Date(),
      })
      .where(eq(classifications.id, id))
      .returning();

    const normalized = normalizeDescriptor(existing.transaction.description);
    await writeToCache(normalized, parsed.data.category);

    return reply.send(updated);
  });
}
