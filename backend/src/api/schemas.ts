import { z } from 'zod';
import { categoryEnum } from '../db/schema.js';

export const CreateTransactionSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  transactionDate: z.coerce.date(),
  type: z.enum(['debit', 'credit']),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

export const BatchCreateTransactionsSchema = z.object({
  transactions: z.array(CreateTransactionSchema).min(1).max(500),
});

export const PatchClassificationSchema = z.object({
  category: z.enum(categoryEnum.enumValues),
});
