import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { merchantCache } from '../db/schema.js';

type Category = (typeof merchantCache.$inferSelect)['category'];

export async function getCachedCategory(normalizedMerchant: string): Promise<Category | null> {
  const [row] = await db
    .select({ category: merchantCache.category })
    .from(merchantCache)
    .where(eq(merchantCache.normalizedMerchant, normalizedMerchant))
    .limit(1);

  if (!row) return null;

  await db
    .update(merchantCache)
    .set({ hitCount: sql`${merchantCache.hitCount} + 1`, updatedAt: new Date() })
    .where(eq(merchantCache.normalizedMerchant, normalizedMerchant));

  return row.category;
}

export async function writeToCache(normalizedMerchant: string, category: Category): Promise<void> {
  await db
    .insert(merchantCache)
    .values({ normalizedMerchant, category, hitCount: 1 })
    .onConflictDoUpdate({
      target: merchantCache.normalizedMerchant,
      set: { category, hitCount: sql`${merchantCache.hitCount} + 1`, updatedAt: new Date() },
    });
}
