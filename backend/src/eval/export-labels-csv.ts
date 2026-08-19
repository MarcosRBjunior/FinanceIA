import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { db } from '../db/client.js';
import { categoryEnum, transactions } from '../db/schema.js';

const SAMPLE_SIZE = 100;
const OUT_PATH = 'eval_labels_para_rotular.csv';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

async function main() {
  const rows = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
    })
    .from(transactions);

  const sample = shuffle(rows).slice(0, Math.min(SAMPLE_SIZE, rows.length));

  const header = 'transaction_id,description,amount,type,expected_category\n';
  const categoriesComment = `# Categorias válidas: ${categoryEnum.enumValues.join(' | ')}\n`;
  const lines = sample.map(
    (r) => `${r.id},"${r.description.replace(/"/g, '""')}",${r.amount},${r.type},`,
  );

  writeFileSync(OUT_PATH, categoriesComment + header + lines.join('\n') + '\n', 'utf-8');

  console.log(`CSV gerado em ${OUT_PATH} com ${sample.length} transações.`);
  console.log('Preencha a coluna "expected_category" para cada linha com uma das categorias válidas.');
  console.log('Depois rode: npm run eval:import -- eval_labels_para_rotular.csv');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
