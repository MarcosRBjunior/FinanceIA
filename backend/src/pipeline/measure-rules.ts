import 'dotenv/config';
import { db } from '../db/client.js';
import { transactions } from '../db/schema.js';
import { applyRules } from './rules.js';

async function main() {
  const rows = await db.select({ description: transactions.description }).from(transactions);

  let resolved = 0;
  const byCategory: Record<string, number> = {};

  for (const row of rows) {
    const category = applyRules(row.description);
    if (category) {
      resolved += 1;
      byCategory[category] = (byCategory[category] ?? 0) + 1;
    }
  }

  const pct = ((resolved / rows.length) * 100).toFixed(1);
  console.log(`Regras resolveram ${resolved}/${rows.length} transações (${pct}%).`);
  console.table(byCategory);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
