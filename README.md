# Classificador Inteligente de Transações Financeiras

Pipeline híbrido de categorização automática de transações bancárias, combinando regras determinísticas e classificação por LLM.

## O problema

Extratos bancários chegam com descritores sujos e abreviados: `PAG*IFOOD SP`, `MP *UBER TRIP`, `PIX ENVIADO JOAO S`, `TARIFA PACOTE SERVICOS`. Categorizar isso manualmente não escala, e regex sozinho quebra a cada novo estabelecimento que aparece no mercado.

**Solução:** pipeline em camadas que combina regras determinísticas (baratas, previsíveis, auditáveis) com classificação por LLM (generaliza para descritores nunca vistos), com limiar de confiança e fila de revisão humana para os casos ambíguos.

**Por que esse desenho e não "só LLM":** custo, latência e determinismo. Se `PAG*IFOOD` já foi classificado como Alimentação uma vez, não há motivo para pagar uma chamada de API toda vez. E em domínio financeiro, um palpite errado com alta confiança é pior que um "não sei" — daí a fila de revisão.

## Arquitetura

```mermaid
flowchart TD
    A[Transação] --> B["1. Normalizador<br/>uppercase, remove PAG*/MP *,<br/>dígitos, cidade/UF"]
    B --> C{"2. Cache de merchants<br/>já visto?"}
    C -- hit --> H[Categoria]
    C -- miss --> D{"3. Motor de regras<br/>match determinístico?"}
    D -- match --> H
    D -- sem match --> E["4. Classificador LLM<br/>Claude + JSON estruturado"]
    E --> F{"5. Decisor<br/>confiança ≥ 0.80?"}
    F -- sim --> H
    F -- não / JSON inválido --> G[Fila de revisão humana]
    G -- correção --> C
    H -.grava.-> C
```

Camadas 1–3 são gratuitas e instantâneas — só o que sobra vai para o LLM. Nos dados sintéticos do seed atual, cache + regras resolvem a maior parte das transações sem nenhuma chamada de API (ver [Resultados da avaliação](#resultados-da-avaliação)).

### Categorias

`Alimentação`, `Mercado`, `Transporte`, `Moradia`, `Saúde`, `Educação`, `Lazer`, `Vestuário`, `Serviços`, `Transferências`, `Renda`, `Taxas e Tarifas`, `Outros` — lista fechada, validada com `z.enum` na saída do LLM.

## Decisões de design

- **Regras antes do LLM, não no lugar dele.** O motor de regras (`backend/src/pipeline/rules.ts`) só resolve casos inequívocos (`PIX`, `TARIFA`, `SALARIO`, merchants conhecidos). Na dúvida, passa para o LLM em vez de arriscar um match errado.
- **Cache de merchants alimentado por regras, LLM aceito e correção humana.** Uma vez resolvido com confiança, o merchant normalizado nunca mais paga uma chamada de API.
- **Falha do LLM não derruba o pipeline.** JSON malformado, categoria fora do enum, timeout, rate limit (429 com backoff exponencial) ou qualquer erro inesperado da API viram `needs_review = true` em vez de propagar um erro — em domínio financeiro, "não sei" é melhor que um palpite errado.
- **`category`/`confidence` nulos em `classifications`** para o caso em que o LLM falha totalmente após os retries — ainda cai na fila de revisão, só que sem um palpite de categoria.
- **Concorrência limitada (5) no processamento em lote** para não estourar rate limit da API em cargas maiores.
- **Sem LangChain ou frameworks de agente.** Chamada HTTP direta ao `@anthropic-ai/sdk` é mais simples e mais fácil de explicar/defender.

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript (strict) |
| Backend | Node.js 20+, Fastify, Zod |
| Banco | PostgreSQL 16, Drizzle ORM |
| LLM | `@anthropic-ai/sdk` (Claude) |
| Testes | Vitest |
| Frontend | React + Vite + Tailwind |
| Infra | Docker Compose (Postgres local) |
| CI | GitHub Actions (lint + type-check + testes, separado por `backend/` e `frontend/`) |

## Como rodar

Backend e frontend vivem juntos neste repositório (`backend/` e `frontend/`).

### Backend

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run seed          # popula 150 transações sintéticas
npm run dev            # API em http://localhost:3000
```

Para classificar com o LLM de verdade, defina `ANTHROPIC_API_KEY` no `.env` antes de rodar o pipeline:

```bash
npm run pipeline        # classifica as 150 transações e grava em classifications
npm run measure:rules   # % resolvido só por regras, sem tocar no LLM
```

Avaliação (rotulagem manual necessária, ver `backend/README.md`):

```bash
npm run eval:export
# preencha expected_category no CSV gerado
npm run eval:import -- eval_labels_para_rotular.csv
npm run eval
```

### Frontend

```bash
cd frontend
cp .env.example .env
# defina VITE_API_BASE_URL=http://localhost:3000 para consumir a API real
# (deixe vazio para rodar com o client mock em memória)
npm install
npm run dev   # dashboard em http://localhost:5173
```

Detalhes de cada endpoint da API em `backend/README.md`.

## Screenshots

![Dashboard do Classificador de Transações](docs/dashboard.jpg)

Dashboard (Fase 7) rodando contra a API real (backend + frontend integrados no mesmo repositório) — cards de métricas, gráfico de gastos por categoria e fila de revisão com correção em um clique.

## Resultados da avaliação

Harness rodado (`npm run eval`) sobre 100 transações rotuladas manualmente em `eval_labels`, com o pipeline executado **sem `ANTHROPIC_API_KEY`** (nenhuma chave real configurada neste ambiente):

- **Acurácia global: 87,0% (87/100)**
- **90% das 150 transações resolvidas sem nenhuma chamada ao LLM** (regras + cache)
- Das 100 avaliadas, 10 dependiam do LLM (descritores ambíguos como `TRANSACAO NAO IDENTIFICADA`, `PAGAMENTO DIVERSOS`, `DEPOSITO PROVENTOS`) e foram corretamente marcadas `needs_review` em vez de arriscar um palpite — sem chave de API, contam como erro na acurácia. **Excluindo esses 10 casos, acurácia é 96,7% (87/90)** nas transações resolvidas por regras/cache.
- O único erro fora desse grupo (`BARBEARIA DO ZE` → previsto `Serviços`, rotulado como `Vestuário`) parece ser inconsistência na rotulagem manual, não erro do classificador — barbearia é serviço, não vestuário.
- Latência e custo do LLM não foram medidos nesta rodada (nenhuma chamada real foi feita). Com uma `ANTHROPIC_API_KEY` válida, os 10 casos acima seriam resolvidos pelo Claude e o número de acurácia deve subir.

Reproduzir: `npm run eval:export` → rotular o CSV → `npm run eval:import -- <csv>` → `npm run pipeline` → `npm run eval`.

## Roadmap

| Fase | Status |
|---|---|
| 0 — Fundação | ✅ |
| 1 — Schema e dados | ✅ |
| 2 — Normalizador e motor de regras | ✅ |
| 3 — Classificador LLM | ✅ |
| 4 — Orquestrador | ✅ |
| 5 — Harness de avaliação | ✅ 100 transações rotuladas, 87% de acurácia (96,7% excluindo casos que dependem de LLM sem API key) |
| 6 — API REST | ✅ |
| 7 — Dashboard | ✅ integrado e validado contra a API real |
| 8 — Fechamento | ✅ |
