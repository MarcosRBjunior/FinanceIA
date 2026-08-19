import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const categoryEnum = pgEnum('category', [
  'Alimentação',
  'Mercado',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Vestuário',
  'Serviços',
  'Transferências',
  'Renda',
  'Taxas e Tarifas',
  'Outros',
]);

export const transactionTypeEnum = pgEnum('transaction_type', ['debit', 'credit']);

export const classificationSourceEnum = pgEnum('classification_source', [
  'cache',
  'rules',
  'llm',
  'human',
]);

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  transactionDate: timestamp('transaction_date', { mode: 'date' }).notNull(),
  type: transactionTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const classifications = pgTable('classifications', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id')
    .notNull()
    .references(() => transactions.id),
  category: categoryEnum('category').notNull(),
  confidence: real('confidence').notNull(),
  source: classificationSourceEnum('source').notNull(),
  reasoning: text('reasoning'),
  modelVersion: text('model_version'),
  latencyMs: integer('latency_ms'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  needsReview: boolean('needs_review').notNull().default(false),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const merchantCache = pgTable('merchant_cache', {
  id: serial('id').primaryKey(),
  normalizedMerchant: text('normalized_merchant').notNull().unique(),
  category: categoryEnum('category').notNull(),
  hitCount: integer('hit_count').notNull().default(1),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const evalLabels = pgTable('eval_labels', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id')
    .notNull()
    .references(() => transactions.id),
  expectedCategory: categoryEnum('expected_category').notNull(),
});
