# Classificador de Transações — Frontend

Dashboard React + Vite + Tailwind para a Fase 7 do [spec](../SPEC_Classificador_Transacoes.md): cards de métricas, gráfico de gastos por categoria e fila de revisão com correção em um clique.

## Rodando localmente

```bash
npm install
npm run dev
```

Sem `VITE_API_BASE_URL` definida, a UI consome um **client mock em memória**
(`src/lib/mock`) que segue o mesmo contrato da API real — dá pra desenvolver
e demonstrar o dashboard sem o backend rodando.

## Ligando na API real

Quando a Fase 6 do backend estiver pronta, copie `.env.example` para `.env` e
defina:

```
VITE_API_BASE_URL=http://localhost:3000
```

Isso troca automaticamente o client mock pelo `src/lib/api/httpClient.ts`
(implementação HTTP real) — nenhum componente precisa mudar, veja
`src/lib/api/index.ts`.

## Estrutura

```
src/
  types/api.ts          tipos do domínio (Transaction, Classification, Metrics, categorias)
  lib/api/client.ts      interface ApiClient — contrato único que a UI conhece
  lib/api/httpClient.ts  implementação real (fetch contra a API REST da Fase 6)
  lib/api/index.ts       escolhe mock ou real com base em VITE_API_BASE_URL
  lib/mock/              dados fake + client mock (mesma interface ApiClient)
  components/            MetricCards, CategorySpendingChart, ReviewQueue
  App.tsx                busca métricas + fila de revisão e monta a página
```

## Contrato assumido com a API (Fase 6)

Endpoints e formato de `PATCH /classifications/:id` seguem a seção 6 do spec.
O formato de `GET /metrics` e o de `GET /classifications?needs_review=true`
(com a transação embutida) são **propostos por este scaffold** — a Fase 6
ainda não existe, então isso precisa ser conferido/ajustado contra a
implementação real. Ver `src/types/api.ts` (`Metrics`,
`ClassificationWithTransaction`) para a forma exata assumida.

## Scripts

| Script           | O que faz                          |
| ---------------- | ----------------------------------- |
| `npm run dev`     | servidor de desenvolvimento         |
| `npm run build`   | typecheck (`tsc -b`) + build de produção |
| `npm run lint`    | ESLint                              |
| `npm run format`  | Prettier `--write`                  |
| `npm run preview` | serve o build de produção localmente |
