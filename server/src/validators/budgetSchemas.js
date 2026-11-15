import { z } from 'zod';

export const budgetSchema = z.object({
  totalCents: z.number().int().min(0),
  categories: z
    .object({
      lodging: z.number().int().min(0).optional(),
      food: z.number().int().min(0).optional(),
      transport: z.number().int().min(0).optional(),
      activities: z.number().int().min(0).optional(),
      other: z.number().int().min(0).optional(),
    })
    .optional(),
});

export const expenseSchema = z.object({
  description: z.string({ error: 'Enter a description.' }).trim().min(1, 'Enter a description.'),
  amountCents: z.number({ error: 'Enter a valid amount.' }).int().min(1, 'Enter a valid amount.'),
  category: z.enum(['lodging', 'food', 'transport', 'activities', 'other']),
  paidBy: z.string().optional(),
  splitAmong: z.array(z.string()).min(1, 'Select at least one member to split among.'),
});
