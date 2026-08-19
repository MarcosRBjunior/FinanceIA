import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { db } from '../db/client.js';
import { categoryEnum, evalLabels } from '../db/schema.js';

type Category = (typeof categoryEnum.enumValues)[number];
const VALID_CATEGORIES = new Set<string>(categoryEnum.enumValues);

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error('Uso: npm run eval:import -- <caminho-do-csv>');
    process.exit(1);
  }

  const content = readFileSync(path, 'utf-8');
  const dataLines = content
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
    .slice(1); // pula o header

  const toInsert: { transactionId: number; expectedCategory: Category }[] = [];
  let skipped = 0;

  for (const line of dataLines) {
    const [idRaw, , , , expectedRaw] = parseCsvLine(line);
    const expected = expectedRaw?.trim();
    const id = Number(idRaw);

    if (!expected || !VALID_CATEGORIES.has(expected)) {
      skipped++;
      continue;
    }

    toInsert.push({ transactionId: id, expectedCategory: expected as Category });
  }

  if (toInsert.length === 0) {
    console.log('Nenhuma linha rotulada encontrada (coluna expected_category vazia ou inválida).');
    process.exit(0);
  }

  await db.insert(evalLabels).values(toInsert);

  console.log(`Importado(s) ${toInsert.length} rótulo(s) para eval_labels.`);
  if (skipped > 0) {
    console.log(`${skipped} linha(s) ignorada(s) (sem categoria ou categoria inválida).`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
