import { apiRequest } from './client.js';

export function fetchBudget(tripId) {
  return apiRequest(`/api/trips/${encodeURIComponent(tripId)}/budget`);
}

export function setBudget(tripId, budget) {
  return apiRequest(`/api/trips/${encodeURIComponent(tripId)}/budget`, {
    method: 'PUT',
    body: budget,
  });
}

export function createExpense(tripId, expense) {
  return apiRequest(`/api/trips/${encodeURIComponent(tripId)}/expenses`, {
    method: 'POST',
    body: expense,
  });
}

export function deleteExpense(tripId, expenseId) {
  return apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(expenseId)}`,
    {
      method: 'DELETE',
    },
  );
}
