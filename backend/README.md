# Classificador de Transações — Backend

Pipeline híbrido (regras + LLM) de categorização de transações bancárias. Ver `../SPEC_Classificador_Transacoes.md` para o spec completo.

## Rodando localmente

```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

`GET http://localhost:3000/health` deve responder `{ "status": "ok" }`.

## Scripts

- `npm run dev` — servidor em watch mode
- `npm run build` / `npm start` — build de produção
- `npm run lint` / `npm run format` — lint e formatação
- `npm test` — testes (Vitest)

## Status

- [x] Fase 0 — Fundação
- [x] Fase 1 — Schema e dados
- [x] Fase 2 — Normalizador e motor de regras (regras resolvem 92.7% das 150 transações do seed)
- [x] Fase 3 — Classificador LLM (testes com SDK mockado; falta validar chamada real — requer `ANTHROPIC_API_KEY` em `.env`)
- [x] Fase 4 — Orquestrador (`npm run pipeline`; validado ponta a ponta com classificador LLM simulado, já que não há `ANTHROPIC_API_KEY` real neste ambiente — grava 150/150 em `classifications`, cache se auto-popula)
- [x] Fase 5 — Harness de avaliação (100 transações rotuladas manualmente; 87% de acurácia global, 96,7% excluindo os casos que dependem do LLM sem `ANTHROPIC_API_KEY` real — ver seção Avaliação abaixo)
- [x] Fase 6 — API REST
- [ ] Fase 7 — Dashboard (frontend, em andamento na branch `dev`)
- [x] Fase 8 — Fechamento (ver README raiz do repositório)

## API (Fase 6)

| Rota | Descrição |
|---|---|
| `POST /transactions` | Cria uma transação e classifica na hora. Body: `{ description, amount, transactionDate, type }` |
| `POST /transactions/batch` | Idem, em lote. Body: `{ transactions: [...] }` (máx. 500) |
| `GET /classifications?needs_review=true` | Lista classificações, cada item com `transaction` aninhado. Filtro opcional por `needs_review` |
| `PATCH /classifications/:id` | Correção humana. Body: `{ category }` — grava `source: "human"`, `needsReview: false` e realimenta o `merchant_cache` |
| `GET /metrics` | `{ accuracy, totalClassified, resolvedWithoutLlmPct, avgLatencyMs, estimatedCostUsd, sourceBreakdown, spendingByCategory }` |

`accuracy` vem de `eval_labels` (Fase 5) e é `null` enquanto não houver rótulos importados. CORS liberado (`origin: true`) para o frontend em dev.

## Avaliação (Fase 5)

```bash
npm run eval:export              # gera eval_labels_para_rotular.csv com 100 transações do seed
# preencha manualmente a coluna expected_category no CSV
npm run eval:import -- eval_labels_para_rotular.csv
npm run pipeline                 # se ainda não rodou, classifica as transações
npm run eval                     # imprime acurácia, matriz de confusão, custo e latência
```

`eval_labels_para_rotular.csv` é gerado localmente (git-ignored) porque referencia os IDs da massa de dados sintética do seed atual — rodar `npm run seed` de novo invalida rótulos já importados que apontem para descrições antigas.

### Resultado real (100 transações rotuladas, sem `ANTHROPIC_API_KEY` configurada)

- Acurácia global: **87,0% (87/100)**
- 90% das 150 transações resolvidas sem LLM (regras + cache)
- 10 das 100 avaliadas dependiam do LLM (descritores ambíguos) e foram corretamente marcadas `needs_review` — sem chave de API, contam como erro. Excluindo esses casos: **96,7% (87/90)**.
- Único erro fora desse grupo (`BARBEARIA DO ZE` → previsto `Serviços`, rotulado `Vestuário`) parece ser inconsistência de rotulagem, não erro do classificador.
