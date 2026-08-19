import 'dotenv/config';
import { desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { classifications, evalLabels, transactions } from '../db/schema.js';

// Preço aproximado do Claude Sonnet (USD por milhão de tokens), só para estimativa de custo.
const PRICE_PER_MILLION_INPUT = 3;
const PRICE_PER_MILLION_OUTPUT = 15;

async function main() {
  const labels = await db
    .select({
      transactionId: evalLabels.transactionId,
      expectedCategory: evalLabels.expectedCategory,
    })
    .from(evalLabels);

  if (labels.length === 0) {
    console.log('Nenhum rótulo em eval_labels ainda. Rode:');
    console.log('  npm run eval:export   # gera o CSV pra você rotular');
    console.log('  npm run eval:import -- <csv>   # importa os rótulos preenchidos');
    process.exit(0);
  }

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

  const allTransactions = await db.select().from(transactions);
  const txById = new Map(allTransactions.map((t) => [t.id, t]));

  let correct = 0;
  let evaluated = 0;
  const perCategory: Record<string, { correct: number; total: number }> = {};
  const confusion: Record<string, Record<string, number>> = {};
  const missingClassification: number[] = [];

  for (const label of labels) {
    const prediction = latestByTransaction.get(label.transactionId);
    if (!prediction) {
      missingClassification.push(label.transactionId);
      continue;
    }

    evaluated++;
    const expected = label.expectedCategory;
    const predicted = prediction.category ?? '(sem categoria — needs_review)';

    perCategory[expected] ??= { correct: 0, total: 0 };
    perCategory[expected]!.total++;

    confusion[expected] ??= {};
    confusion[expected]![predicted] = (confusion[expected]![predicted] ?? 0) + 1;

    if (predicted === expected) {
      correct++;
      perCategory[expected]!.correct++;
    }
  }

  const bySource: Record<string, number> = {};
  let totalLatency = 0;
  let latencyCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const c of latestByTransaction.values()) {
    bySource[c.source] = (bySource[c.source] ?? 0) + 1;
    if (c.latencyMs != null) {
      totalLatency += c.latencyMs;
      latencyCount++;
    }
    totalInputTokens += c.inputTokens ?? 0;
    totalOutputTokens += c.outputTokens ?? 0;
  }

  const total = latestByTransaction.size;
  const resolvedWithoutLlm = total - (bySource.llm ?? 0);
  const estimatedCost =
    (totalInputTokens / 1_000_000) * PRICE_PER_MILLION_INPUT +
    (totalOutputTokens / 1_000_000) * PRICE_PER_MILLION_OUTPUT;

  console.log('=== Harness de avaliação ===\n');

  console.log(`Acurácia global: ${evaluated > 0 ? ((correct / evaluated) * 100).toFixed(1) : '0.0'}% (${correct}/${evaluated})`);
  if (missingClassification.length > 0) {
    console.log(
      `Aviso: ${missingClassification.length} transação(ões) rotuladas ainda não têm classificação — rode "npm run pipeline" antes.`,
    );
  }

  console.log('\nAcurácia por categoria:');
  console.table(
    Object.fromEntries(
      Object.entries(perCategory).map(([cat, v]) => [
        cat,
        `${((v.correct / v.total) * 100).toFixed(1)}% (${v.correct}/${v.total})`,
      ]),
    ),
  );

  console.log('\nMatriz de confusão (linha = esperado, coluna = previsto, só divergências):');
  for (const [expected, predictions] of Object.entries(confusion)) {
    const wrong = Object.entries(predictions).filter(([predicted]) => predicted !== expected);
    if (wrong.length > 0) {
      console.log(`  ${expected} →`, Object.fromEntries(wrong));
    }
  }

  console.log('\nDistribuição por source (todas as transações classificadas, não só as avaliadas):');
  console.table(bySource);

  console.log(`\n% resolvido sem LLM: ${total > 0 ? ((resolvedWithoutLlm / total) * 100).toFixed(1) : '0.0'}%`);
  console.log(
    `Latência média (source=llm): ${latencyCount > 0 ? (totalLatency / latencyCount).toFixed(0) : '—'} ms`,
  );
  console.log(`Custo estimado (tokens LLM): US$ ${estimatedCost.toFixed(4)}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
