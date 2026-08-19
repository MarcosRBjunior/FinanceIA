# Classificador Inteligente de Transações Financeiras

**Spec técnico e roadmap de execução** — documento para servir de contexto em workflow com Claude Code / Cursor.

---

## 1. O PROBLEMA

Extratos bancários chegam com descritores sujos e abreviados: `PAG*IFOOD SP`, `MP *UBER TRIP`, `PIX ENVIADO JOAO S`, `TARIFA PACOTE SERVICOS`. Categorizar isso manualmente não escala, e regex sozinho quebra a cada novo estabelecimento que aparece no mercado.

**Solução:** pipeline híbrido que combina regras determinísticas (baratas, previsíveis, auditáveis) com classificação por LLM (generaliza para descritores nunca vistos), com limiar de confiança e fila de revisão humana para os casos ambíguos.

**Por que esse desenho e não "só LLM":** custo, latência e determinismo. Se `PAG*IFOOD` já foi classificado como Alimentação uma vez, não há motivo para pagar uma chamada de API toda vez. E em domínio financeiro, um palpite errado com alta confiança é pior que um "não sei" — daí a fila de revisão.

> Guarde esse parágrafo. É a resposta para "por que você fez assim?" na entrevista técnica.

---

## 2. STACK

Escolhida para reaproveitar o que você já domina — o projeto precisa ser defensável numa sabatina técnica.

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Linguagem | TypeScript (strict) | Tipagem end-to-end; já é sua base |
| Runtime | Node.js 20+ | Já é sua base |
| API | Fastify | Mais leve e rápido que Express, com schema validation nativo |
| Banco | PostgreSQL 16 | Requisito de SQL da vaga; consultas analíticas reais |
| ORM | Drizzle ORM | Você já usou no BarberWEB — consistência com o CV |
| LLM | `@anthropic-ai/sdk` (Claude) | API direta, o requisito central da vaga |
| Validação | Zod | Valida a saída JSON do LLM antes de confiar nela |
| Testes | Vitest | Rápido, config mínima |
| Front (opcional) | React + Vite + Tailwind | Dashboard de métricas e fila de revisão |
| Infra | Docker Compose | Postgres local sem instalar nada na máquina |
| CI | GitHub Actions | Lint + testes a cada push |

**Não use:** LangChain ou frameworks de agente. Para esse escopo eles escondem a lógica que você precisa saber explicar. Chamada HTTP direta ao SDK é mais simples e mais defensável.

---

## 3. ARQUITETURA

```
Transação
    │
    ▼
┌─────────────────────┐
│ 1. Normalizador     │  uppercase, remove ruído (PAG*, MP *, dígitos, cidade/UF)
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 2. Cache de         │  merchant normalizado já visto? → devolve categoria
│    merchants        │  (fonte: classificações confirmadas)
└─────────────────────┘
    │ miss
    ▼
┌─────────────────────┐
│ 3. Motor de regras  │  match determinístico (PIX → Transferência,
│                     │  TARIFA/IOF → Taxas, SALARIO → Renda)
└─────────────────────┘
    │ sem match
    ▼
┌─────────────────────┐
│ 4. Classificador    │  Claude + saída JSON estruturada
│    LLM              │  { categoria, confianca, justificativa }
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 5. Decisor          │  confiança ≥ 0.80 → aceita e grava no cache
│                     │  confiança < 0.80 → fila de revisão
│                     │  JSON inválido após 2 retries → fila de revisão
└─────────────────────┘
```

**Camadas 1–3 são gratuitas e instantâneas.** Só o que sobra vai para o LLM. Meça isso: a taxa de acerto do cache + regras é uma métrica sua para mostrar.

### Categorias
`Alimentação`, `Mercado`, `Transporte`, `Moradia`, `Saúde`, `Educação`, `Lazer`, `Vestuário`, `Serviços`, `Transferências`, `Renda`, `Taxas e Tarifas`, `Outros`

Lista fechada, passada no prompt. O validador Zod usa `z.enum` — se o modelo inventar uma categoria fora da lista, a validação rejeita e dispara retry.

---

## 4. MODELO DE DADOS

```
transactions
  id, description, amount, transaction_date, type (debit|credit), created_at

classifications
  id, transaction_id → transactions
  category, confidence, source (cache|rules|llm|human)
  reasoning, model_version
  latency_ms, input_tokens, output_tokens
  needs_review (bool), reviewed_at, created_at

merchant_cache
  id, normalized_merchant (unique), category, hit_count, updated_at

eval_labels
  id, transaction_id → transactions, expected_category
```

Guardar `source`, `latency_ms` e tokens é o que te permite escrever números concretos no currículo depois.

---

## 5. ROADMAP EM FASES

Cada fase é um commit funcional. Não avance com a anterior quebrada.

### Fase 0 — Fundação `~1h`
Repo, TypeScript strict, ESLint + Prettier, `docker-compose.yml` com Postgres, `.env.example`, `.gitignore` com `.env`, README esqueleto.
**Aceite:** `docker compose up` sobe o banco; `npm run dev` roda sem erro.

### Fase 1 — Schema e dados `~2h`
Schema Drizzle, migrations, seed com ~150 transações brasileiras sintéticas — descritores sujos e realistas (PIX, boleto, cartão, tarifas, salário, assinaturas).
**Aceite:** `npm run seed` popula o banco; `SELECT` retorna as 150 linhas.

### Fase 2 — Normalizador e motor de regras `~2h`
Normalização de descritor + regras determinísticas para os casos óbvios. Testes unitários cobrindo cada regra.
**Aceite:** testes passando; medir e imprimir qual % das 150 transações as regras resolvem sozinhas.

### Fase 3 — Classificador LLM `~3h`
Integração com a API do Claude. Prompt com a lista fechada de categorias, poucos exemplos, e instrução de responder só JSON. Schema Zod validando a resposta. Tratamento de: timeout, HTTP 429 com backoff exponencial, JSON malformado com até 2 retries.
**Aceite:** classifica uma transação real; testes com respostas mockadas cobrindo os três modos de falha.

### Fase 4 — Orquestrador `~2h`
Pipeline completo: cache → regras → LLM → decisor. Limiar de confiança configurável por env. Processamento em lote com concorrência limitada (ex.: 5 simultâneas).
**Aceite:** roda nas 150 transações de ponta a ponta e grava tudo em `classifications`.

### Fase 5 — Harness de avaliação `~2h` ← **a fase que mais diferencia**
Rotular manualmente ~100 transações em `eval_labels`. Script que roda o pipeline e reporta: acurácia global, acurácia por categoria, matriz de confusão simples, % resolvido sem LLM, latência média e custo estimado.
**Aceite:** `npm run eval` imprime o relatório de métricas.

> A maioria dos projetos de portfólio para se dizer "com IA" para aqui: chama a API e mostra a resposta. Ter medição própria é o que separa o seu.

### Fase 6 — API REST `~2h`
`POST /transactions` (cria e classifica), `POST /transactions/batch`, `GET /classifications?needs_review=true`, `PATCH /classifications/:id` (correção humana → alimenta o cache), `GET /metrics`.
**Aceite:** endpoints respondendo, com validação de entrada.

### Fase 7 — Dashboard `~3h` *(opcional, mas rende bem)*
React + Vite: cards de métricas, gráfico de gastos por categoria, fila de revisão com correção em um clique.
**Aceite:** roda local consumindo a API.

### Fase 8 — Fechamento `~2h`
GitHub Actions (lint + test), README completo (problema, arquitetura, decisões, como rodar, resultados da avaliação), diagrama, screenshots.
**Aceite:** repositório público, clonável, roda seguindo só o README.

**Total: 2 a 3 dias de trabalho concentrado.** Fases 0–5 são o mínimo viável e já sustentam o item no currículo. 6–8 são o acabamento.

---

## 6. PROMPTS PARA O WORKFLOW

Abra o Claude Code na raiz do projeto com este arquivo salvo como `SPEC.md`. Abra uma sessão por fase — contexto limpo produz código melhor.

**Prompt de abertura (uma vez):**
```
Leia SPEC.md por completo. Vamos construir esse projeto em fases,
uma por vez. Não pule adiante nem gere código de fases futuras.
Antes de escrever código, me diga em 3 linhas o que entendeu do escopo.
```

**Fase 0:**
```
Execute a Fase 0 do SPEC.md. Crie a estrutura do projeto: package.json,
tsconfig strict, ESLint + Prettier, docker-compose.yml com Postgres 16,
.env.example e .gitignore (com .env). Nada de lógica de negócio ainda.
Ao final, me diga os comandos exatos para eu validar o critério de aceite.
```

**Fase 1:**
```
Execute a Fase 1. Crie o schema Drizzle conforme a seção 4 do SPEC.md,
a migration inicial e um seed com 150 transações brasileiras sintéticas.
Os descritores precisam ser realistas e sujos: PAG*, MP *, abreviações,
cidade/UF no fim, PIX enviado/recebido, tarifas, salário, assinaturas.
Distribua entre todas as 13 categorias, sem equilíbrio artificial —
Alimentação e Transporte devem aparecer mais, como na vida real.
```

**Fase 2:**
```
Execute a Fase 2. Implemente o normalizador de descritor e o motor de
regras determinísticas. Regras só para casos inequívocos — na dúvida,
deixe passar para o LLM. Escreva testes Vitest para cada regra, incluindo
casos negativos. Ao final, rode nas 150 transações do seed e me diga qual
percentual as regras resolveram sozinhas.
```

**Fase 3:**
```
Execute a Fase 3. Integre a API do Claude via @anthropic-ai/sdk.
Requisitos:
- prompt com a lista fechada de 13 categorias e 3-4 exemplos
- resposta apenas em JSON: { categoria, confianca (0-1), justificativa }
- validação com Zod usando z.enum para a categoria
- retry (máx 2) quando o JSON for inválido ou fugir do enum
- backoff exponencial em HTTP 429
- timeout de 15s
- API key só via process.env, nunca hardcoded
Escreva testes com o SDK mockado cobrindo: sucesso, JSON malformado,
categoria inventada, 429 e timeout.
```

**Fase 4:**
```
Execute a Fase 4. Monte o orquestrador com o pipeline da seção 3:
normalizar → cache → regras → LLM → decisor. Limiar de confiança vindo
de env (padrão 0.80). Abaixo do limiar, marque needs_review = true.
Acima, grave o merchant no cache. Registre em classifications: source,
confidence, latency_ms e tokens. Processamento em lote com concorrência
máxima de 5. Rode nas 150 transações e me mostre o resumo.
```

**Fase 5:**
```
Execute a Fase 5. Crie o harness de avaliação: script que lê eval_labels,
roda o pipeline e reporta acurácia global, acurácia por categoria, matriz
de confusão, distribuição por source, latência média e custo estimado.
Saída legível no terminal. Gere também um CSV com 100 transações do seed
para eu rotular manualmente e importar.
```

**Fases 6, 7 e 8:** mesmo padrão — cite a fase, repita os critérios de aceite do spec.

**Depois de cada fase:**
```
Explique as decisões de design que você tomou nesta fase e onde o código
quebraria se o volume fosse 100x maior.
```

Esse último é para você, não para o código. Se não conseguir reexplicar a resposta com suas palavras, releia até conseguir — é sobre isso que vão te perguntar.

---

## 7. CHECKLIST ANTES DE PUBLICAR

- [ ] `.env` no `.gitignore` e **fora** do histórico do git (confira com `git log -p | grep -i "sk-ant"`)
- [ ] Repositório público
- [ ] README: problema, arquitetura, decisões de design, como rodar, resultados da avaliação
- [ ] Diagrama do pipeline no README
- [ ] CI verde no GitHub Actions
- [ ] `git clone` em pasta limpa e seguir o próprio README de ponta a ponta
- [ ] Commits com mensagens descritivas (o histórico conta a história do projeto)

---

## 8. BULLETS PARA O CURRÍCULO

Preencher com os números reais da sua avaliação:

> **Classificador Inteligente de Transações Financeiras**
> Pipeline híbrido de categorização automática de transações bancárias, combinando regras determinísticas e classificação por LLM.
> - Projetei arquitetura em camadas (cache → regras → LLM) que resolve **[X]%** das transações sem chamada de API, reduzindo custo e latência frente à abordagem puramente LLM.
> - Integrei a API do Claude com saída JSON estruturada validada por Zod, retry automático e backoff exponencial em rate limit, garantindo robustez contra respostas malformadas.
> - Implementei limiar de confiança com fila de revisão humana, priorizando precisão sobre cobertura em domínio financeiro; correções humanas realimentam o cache.
> - Construí harness de avaliação com **[N]** transações rotuladas, atingindo **[X]%** de acurácia e latência média de **[X]ms**.
> - Modelei o banco em PostgreSQL com telemetria por classificação (fonte, confiança, tokens, latência) para análise via SQL.
> - Stack: TypeScript, Node.js, Fastify, PostgreSQL, Drizzle ORM, Claude API, Zod, Vitest, Docker
