import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ApiError } from '../api/client.js';
import { fetchTrip } from '../api/trips.js';
import { fetchBudget, deleteExpense } from '../api/budget.js';
import Button from '../components/Button.jsx';
import LoadingState from '../components/LoadingState.jsx';
import TripHeader from '../components/TripHeader.jsx';
import FormError from '../features/auth/FormError.jsx';
import LogExpenseForm from '../features/budget/LogExpenseForm.jsx';
import SetBudgetForm from '../features/budget/SetBudgetForm.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { formatCents } from '../lib/money.js';

const CATEGORY_DISPLAY = {
  lodging: 'Accommodations',
  food: 'Food',
  transport: 'Transport',
  activities: 'Activities',
  other: 'Other',
};

export default function BudgetPage() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [budget, setBudget] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function loadData() {
      try {
        const [tripData, budgetData] = await Promise.all([fetchTrip(tripId), fetchBudget(tripId)]);
        if (isCurrent) {
          setTrip(tripData);
          setBudget(budgetData);
        }
      } catch (error) {
        if (isCurrent) {
          setLoadError(
            error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isCurrent = false;
    };
  }, [tripId]);

  async function refreshBudget() {
    try {
      const budgetData = await fetchBudget(tripId);
      setBudget(budgetData);
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    }
  }

  async function handleDeleteExpense(expenseId) {
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('Delete this expense?'))
      return;
    setActionError('');
    try {
      await deleteExpense(tripId, expenseId);
      await refreshBudget();
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    }
  }

  if (isLoading) return <LoadingState label="Loading budget…" />;
  if (loadError) return <FormError message={loadError} />;
  if (!trip || !budget) return null;

  const isOrganizer = trip.role === 'organizer';
  const currentMember =
    trip.members?.find((m) => m.userId === user?.id && m.role === trip.role) ||
    trip.members?.find((m) => m.userId === user?.id) ||
    trip.members?.find((m) => m.role === trip.role);
  const currentUserId = currentMember?.userId ?? user?.id;

  return (
    <section className="flex flex-col gap-6 pb-24">
      <TripHeader trip={trip} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ink">Budget</h1>
      </div>

      <FormError message={actionError} />

      {/* Summary cards: Planned, Spent, Remaining */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-card p-4">
          <p className="text-sm font-semibold text-muted">Planned</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatCents(budget.totalCents ?? 0)}</p>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <p className="text-sm font-semibold text-muted">Spent</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatCents(budget.spentCents ?? 0)}</p>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <p className="text-sm font-semibold text-muted">Remaining</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              (budget.remainingCents ?? 0) < 0 ? 'text-danger' : 'text-ink'
            }`}
          >
            {formatCents(budget.remainingCents ?? 0)}
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      {budget.byCategory && budget.byCategory.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-ink">Category Breakdown</h2>
          <div className="flex flex-col gap-3">
            {budget.byCategory.map((cat) => {
              const isOverBudget = cat.overBudgetCents > 0;
              const percentage =
                cat.plannedCents > 0
                  ? Math.min(100, Math.round((cat.spentCents / cat.plannedCents) * 100))
                  : cat.spentCents > 0
                    ? 100
                    : 0;
              const barColor = isOverBudget ? 'bg-danger' : 'bg-primary';

              return (
                <div
                  key={cat.category}
                  className="flex flex-col gap-2 rounded-card border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold capitalize text-ink">
                        {CATEGORY_DISPLAY[cat.category] || cat.category}
                      </span>
                      <div className="text-sm text-muted">
                        {formatCents(cat.spentCents)} of {formatCents(cat.plannedCents)}
                      </div>
                    </div>
                    {isOverBudget && (
                      <p className="text-sm font-semibold text-danger">
                        Over budget by {formatCents(cat.overBudgetCents)}
                      </p>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div
                    role="progressbar"
                    aria-label={`${CATEGORY_DISPLAY[cat.category] || cat.category} budget spent`}
                    aria-valuenow={cat.spentCents}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(cat.plannedCents, cat.spentCents)}
                    className="h-2.5 w-full overflow-hidden rounded-full bg-border"
                  >
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Member Balances */}
      {budget.balances && budget.balances.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-ink">Member Balances</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {budget.balances.map((b) => (
              <div
                key={b.userId}
                className="flex items-center justify-between rounded-card border border-border bg-card p-4"
              >
                <span className="font-semibold text-ink">{b.name}</span>
                <span
                  className={`font-bold ${
                    b.balanceCents > 0
                      ? 'text-success'
                      : b.balanceCents < 0
                        ? 'text-danger'
                        : 'text-muted'
                  }`}
                >
                  {b.balanceCents > 0
                    ? `+${formatCents(b.balanceCents)}`
                    : b.balanceCents < 0
                      ? `$-${formatCents(Math.abs(b.balanceCents)).slice(1)}`
                      : formatCents(0)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Expenses Table */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-ink">Expenses</h2>
        {budget.expenses && budget.expenses.length > 0 ? (
          <div className="overflow-x-auto rounded-card border border-border bg-card">
            <table className="w-full text-left text-sm text-ink">
              <thead className="border-b border-border bg-page text-xs uppercase text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Description
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Paid by
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Split among
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {budget.expenses.map((expense) => {
                  const canDelete =
                    isOrganizer ||
                    expense.paidBy?.userId === currentUserId ||
                    expense.createdBy === currentUserId;
                  return (
                    <tr key={expense.id} className="hover:bg-page/50">
                      <td className="px-4 py-3 font-medium text-ink">{expense.description}</td>
                      <td className="px-4 py-3 font-semibold text-ink">
                        {formatCents(expense.amountCents)}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted">{expense.category}</td>
                      <td className="px-4 py-3 text-muted">Paid by {expense.paidBy?.name}</td>
                      <td className="px-4 py-3 text-muted">
                        Split: {expense.splitAmong?.map((m) => m.name).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canDelete && (
                          <Button
                            variant="secondary"
                            className="min-h-9 px-3 text-xs"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-card border border-border bg-card p-6 text-center text-muted">
            No expenses logged yet.
          </div>
        )}
      </section>

      {/* Log expense form */}
      <LogExpenseForm
        tripId={tripId}
        members={trip.members}
        defaultPayerId={currentUserId}
        onExpenseLogged={refreshBudget}
      />

      {/* Set budget form (Organizer only) */}
      {isOrganizer && (
        <SetBudgetForm tripId={tripId} budget={budget} onBudgetSaved={refreshBudget} />
      )}
    </section>
  );
}
