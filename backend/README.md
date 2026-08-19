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
- [ ] Fase 1 — Schema e dados
- [ ] Fase 2 — Normalizador e motor de regras
- [ ] Fase 3 — Classificador LLM
- [ ] Fase 4 — Orquestrador
- [ ] Fase 5 — Harness de avaliação
- [ ] Fase 6 — API REST
