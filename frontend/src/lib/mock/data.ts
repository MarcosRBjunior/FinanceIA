import type {
  Category,
  Classification,
  ClassificationSource,
  ClassificationWithTransaction,
  Transaction,
} from '../../types/api';

let nextId = 1;
function id(prefix: string): string {
  return `${prefix}_${(nextId++).toString(36)}`;
}

interface Seed {
  description: string;
  amount: number;
  type: Transaction['type'];
  category: Category;
  source: ClassificationSource;
  confidence: number;
  needsReview: boolean;
}

const SEEDS: Seed[] = [
  {
    description: 'PAG*IFOOD SP',
    amount: -47.9,
    type: 'debit',
    category: 'Alimentação',
    source: 'cache',
    confidence: 0.97,
    needsReview: false,
  },
  {
    description: 'MP *UBER TRIP',
    amount: -18.5,
    type: 'debit',
    category: 'Transporte',
    source: 'rules',
    confidence: 1,
    needsReview: false,
  },
  {
    description: 'PIX ENVIADO JOAO S',
    amount: -300,
    type: 'debit',
    category: 'Transferências',
    source: 'rules',
    confidence: 1,
    needsReview: false,
  },
  {
    description: 'TARIFA PACOTE SERVICOS',
    amount: -29.9,
    type: 'debit',
    category: 'Taxas e Tarifas',
    source: 'rules',
    confidence: 1,
    needsReview: false,
  },
  {
    description: 'SUPERMERCADO EXTRA SP',
    amount: -284.3,
    type: 'debit',
    category: 'Mercado',
    source: 'cache',
    confidence: 0.95,
    needsReview: false,
  },
  {
    description: 'NETFLIX.COM',
    amount: -39.9,
    type: 'debit',
    category: 'Lazer',
    source: 'cache',
    confidence: 0.98,
    needsReview: false,
  },
  {
    description: 'FARMACIA SAO JOAO BH',
    amount: -62.15,
    type: 'debit',
    category: 'Saúde',
    source: 'llm',
    confidence: 0.88,
    needsReview: false,
  },
  {
    description: 'SALARIO EMPRESA XYZ LTDA',
    amount: 4500,
    type: 'credit',
    category: 'Renda',
    source: 'rules',
    confidence: 1,
    needsReview: false,
  },
  {
    description: 'PAG*POSTOSHELL RJ',
    amount: -180,
    type: 'debit',
    category: 'Transporte',
    source: 'llm',
    confidence: 0.79,
    needsReview: true,
  },
  {
    description: 'LOJAS RENNER 0234 SP',
    amount: -159.9,
    type: 'debit',
    category: 'Vestuário',
    source: 'llm',
    confidence: 0.91,
    needsReview: false,
  },
  {
    description: 'ALUGUEL IMOB CENTRAL',
    amount: -1800,
    type: 'debit',
    category: 'Moradia',
    source: 'rules',
    confidence: 1,
    needsReview: false,
  },
  {
    description: 'UDEMY *CURSO ONLINE',
    amount: -54.9,
    type: 'debit',
    category: 'Educação',
    source: 'llm',
    confidence: 0.86,
    needsReview: false,
  },
  {
    description: 'MP *ESTACIONAMENTO ZN',
    amount: -12,
    type: 'debit',
    category: 'Transporte',
    source: 'llm',
    confidence: 0.62,
    needsReview: true,
  },
  {
    description: 'PIX RECEBIDO MARIA F',
    amount: 220,
    type: 'credit',
    category: 'Transferências',
    source: 'rules',
    confidence: 1,
    needsReview: false,
  },
  {
    description: 'DROGASIL FILIAL 88',
    amount: -38.7,
    type: 'debit',
    category: 'Saúde',
    source: 'cache',
    confidence: 0.94,
    needsReview: false,
  },
  {
    description: 'PAG*RESTAURANTETIJUCA',
    amount: -96.4,
    type: 'debit',
    category: 'Alimentação',
    source: 'llm',
    confidence: 0.7,
    needsReview: true,
  },
  {
    description: 'IOF OPERACAO CARTAO',
    amount: -4.35,
    type: 'debit',
    category: 'Taxas e Tarifas',
    source: 'rules',
    confidence: 1,
    needsReview: false,
  },
  {
    description: 'SPOTIFY PREMIUM',
    amount: -21.9,
    type: 'debit',
    category: 'Lazer',
    source: 'cache',
    confidence: 0.99,
    needsReview: false,
  },
  {
    description: 'MERCADO LIVRE COMPRA',
    amount: -134.5,
    type: 'debit',
    category: 'Outros',
    source: 'llm',
    confidence: 0.55,
    needsReview: true,
  },
  {
    description: 'CONDOMINIO ED CENTRAL',
    amount: -650,
    type: 'debit',
    category: 'Moradia',
    source: 'rules',
    confidence: 1,
    needsReview: false,
  },
];

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

interface SeededRow {
  transaction: Transaction;
  classification: Classification;
}

const rows: SeededRow[] = SEEDS.map((seed, i) => {
  const createdAt = daysAgoIso(SEEDS.length - i);
  const transaction: Transaction = {
    id: id('txn'),
    description: seed.description,
    amount: seed.amount,
    transactionDate: createdAt.slice(0, 10),
    type: seed.type,
    createdAt,
  };
  const classification: Classification = {
    id: id('clf'),
    transactionId: transaction.id,
    category: seed.category,
    confidence: seed.confidence,
    source: seed.source,
    reasoning:
      seed.source === 'llm'
        ? `Descritor "${seed.description}" mapeado para ${seed.category} por similaridade semântica.`
        : null,
    modelVersion: seed.source === 'llm' ? 'claude-sonnet-5' : null,
    latencyMs:
      seed.source === 'llm'
        ? 400 + Math.round(Math.random() * 900)
        : seed.source === 'cache'
          ? 3
          : 1,
    inputTokens: seed.source === 'llm' ? 320 : null,
    outputTokens: seed.source === 'llm' ? 40 : null,
    needsReview: seed.needsReview,
    reviewedAt: null,
    createdAt,
  };
  return { transaction, classification };
});

export function getMockRows(): SeededRow[] {
  return rows;
}

export function toWithTransaction(row: SeededRow): ClassificationWithTransaction {
  return { ...row.classification, transaction: row.transaction };
}

export function makeSeededRow(
  input: Pick<Transaction, 'description' | 'amount' | 'type' | 'transactionDate'>,
  classification: Omit<Classification, 'id' | 'transactionId' | 'createdAt'>,
): SeededRow {
  const now = new Date().toISOString();
  const transaction: Transaction = {
    id: id('txn'),
    description: input.description,
    amount: input.amount,
    transactionDate: input.transactionDate,
    type: input.type,
    createdAt: now,
  };
  const full: Classification = {
    ...classification,
    id: id('clf'),
    transactionId: transaction.id,
    createdAt: now,
  };
  return { transaction, classification: full };
}
