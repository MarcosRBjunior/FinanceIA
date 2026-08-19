import 'dotenv/config';
import { runPipeline } from './orchestrator.js';

async function main() {
  const results = await runPipeline();

  const bySource: Record<string, number> = {};
  let needsReview = 0;

  for (const r of results) {
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
    if (r.needsReview) needsReview += 1;
  }

  console.log(`Pipeline rodou em ${results.length} transações.`);
  console.table(bySource);
  console.log(`Fila de revisão: ${needsReview}/${results.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
