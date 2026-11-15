import { Router } from 'express';
import {
  setBudget,
  createExpense,
  getBudget,
  deleteExpense,
} from '../controllers/budgetController.js';
import { requireTripRole } from '../middleware/requireTripRole.js';
import { validateBody } from '../middleware/validate.js';
import { budgetSchema, expenseSchema } from '../validators/budgetSchemas.js';

export function createBudgetRouter() {
  const router = Router({ mergeParams: true });

  router.put('/', requireTripRole('organizer'), validateBody(budgetSchema), setBudget);
  router.get('/', requireTripRole(), getBudget);

  return router;
}

export function createExpenseRouter() {
  const router = Router({ mergeParams: true });

  router.use(requireTripRole());

  router.post('/', validateBody(expenseSchema), createExpense);
  router.delete('/:expenseId', deleteExpense);

  return router;
}
