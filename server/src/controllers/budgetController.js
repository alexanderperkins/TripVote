import {
  setBudget as setBudgetRecord,
  createExpense as createExpenseRecord,
  getBudgetSummary as getBudgetSummaryRecord,
  deleteExpense as deleteExpenseRecord,
} from '../services/budgetService.js';

export async function setBudget(req, res) {
  const budget = await setBudgetRecord(req.params.tripId, req.body);
  res.json(budget);
}

export async function createExpense(req, res) {
  const expense = await createExpenseRecord(req.params.tripId, req.user, req.body);
  res.status(201).json(expense);
}

export async function getBudget(req, res) {
  const summary = await getBudgetSummaryRecord(req.params.tripId);
  res.json(summary);
}

export async function deleteExpense(req, res) {
  await deleteExpenseRecord(req.params.tripId, req.params.expenseId, req.user, req.membership.role);
  res.status(204).end();
}
