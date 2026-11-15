import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import BudgetPage from './BudgetPage.jsx';
import { AuthContext } from '../features/auth/authContext.js';

const USER = { id: 'user-1', name: 'Ana Lopez', email: 'ana@example.com' };
const TRIP = {
  id: 'trip-1',
  name: 'Lisbon',
  destination: 'Portugal',
  startDate: '2026-12-01',
  endDate: '2026-12-07',
  role: 'member',
  members: [
    { userId: 'user-1', name: 'Ana Lopez', role: 'organizer' },
    { userId: 'user-2', name: 'Sam Rivera', role: 'member' },
  ],
};

const BUDGET = {
  totalCents: 100000,
  spentCents: 120000,
  remainingCents: -20000,
  byCategory: [
    { category: 'lodging', plannedCents: 50000, spentCents: 65000, overBudgetCents: 15000 },
    { category: 'food', plannedCents: 30000, spentCents: 20000, overBudgetCents: 0 },
    { category: 'transport', plannedCents: 10000, spentCents: 15000, overBudgetCents: 5000 },
    { category: 'activities', plannedCents: 10000, spentCents: 20000, overBudgetCents: 10000 },
    { category: 'other', plannedCents: 0, spentCents: 0, overBudgetCents: 0 },
  ],
  balances: [
    { userId: 'user-1', name: 'Ana Lopez', balanceCents: 45000 },
    { userId: 'user-2', name: 'Sam Rivera', balanceCents: -45000 },
  ],
  expenses: [
    {
      id: 'expense-1',
      description: 'Hotel stay',
      amountCents: 65000,
      category: 'lodging',
      paidBy: { userId: 'user-1', name: 'Ana Lopez' },
      splitAmong: [
        { userId: 'user-1', name: 'Ana Lopez' },
        { userId: 'user-2', name: 'Sam Rivera' },
      ],
      createdAt: '2026-12-01T10:00:00.000Z',
    },
  ],
};

function renderBudget(role = 'member', user = USER, budgetOverrides = {}) {
  const budget = { ...BUDGET, ...budgetOverrides };
  const trip = { ...TRIP, role };

  vi.stubGlobal(
    'fetch',
    vi.fn((url) => {
      const data = String(url).endsWith('/budget') ? budget : trip;
      return Promise.resolve(
        new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }),
  );

  return render(
    <MemoryRouter initialEntries={['/trips/trip-1/budget']}>
      <AuthContext.Provider value={{ user }}>
        <Routes>
          <Route path="/trips/:tripId/budget" element={<BudgetPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('BudgetPage', () => {
  it('shows the budget summary with planned, spent, and remaining amounts', async () => {
    renderBudget();

    expect(await screen.findByRole('heading', { name: /budget/i })).toBeInTheDocument();
    expect(screen.getByText(/\$1,000\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\$1,200\.00/)).toBeInTheDocument();
    expect(screen.getByText(/-\$200\.00|\$-200\.00/)).toBeInTheDocument();
  });

  it('shows per-category rows with the text "Over budget by $X.XX" for overspent categories', async () => {
    renderBudget();

    expect(await screen.findByRole('heading', { name: /budget/i })).toBeInTheDocument();
    expect(screen.getByText(/over budget by \$150\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/over budget by \$50\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/over budget by \$100\.00/i)).toBeInTheDocument();
  });

  it('shows member balances', async () => {
    renderBudget();

    expect(await screen.findByRole('heading', { name: /budget/i })).toBeInTheDocument();
    expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    expect(screen.getByText('Sam Rivera')).toBeInTheDocument();
    expect(screen.getByText(/\+?\$450\.00/)).toBeInTheDocument();
    expect(screen.getByText(/-\$450\.00|\$-450\.00/)).toBeInTheDocument();
  });

  it('shows the expenses table with description, amount, category, and payer', async () => {
    renderBudget();

    expect(await screen.findByRole('heading', { name: /budget/i })).toBeInTheDocument();
    expect(screen.getByText('Hotel stay')).toBeInTheDocument();
    expect(screen.getByText('$650.00')).toBeInTheDocument();
    expect(screen.getByText(/lodging/i)).toBeInTheDocument();
  });

  it('provides a labeled Log expense form with fields What, Amount, Category, Paid by, Split among', async () => {
    renderBudget();

    expect(await screen.findByRole('heading', { name: /budget/i })).toBeInTheDocument();
    expect(screen.getByLabelText('What')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Paid by')).toBeInTheDocument();
    expect(screen.getByLabelText('Split among')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log expense/i })).toBeInTheDocument();
  });

  it('shows the error "Enter a positive amount with up to two decimals." for invalid amounts', async () => {
    const user = userEvent.setup();
    renderBudget();

    expect(await screen.findByRole('heading', { name: /budget/i })).toBeInTheDocument();
    const amountInput = screen.getByLabelText('Amount');
    await user.type(amountInput, '0');
    await user.click(screen.getByRole('button', { name: /log expense/i }));

    expect(
      await screen.findByText('Enter a positive amount with up to two decimals.'),
    ).toBeInTheDocument();
  });

  it('shows the Set budget form only to the Organizer', async () => {
    const { unmount } = renderBudget('organizer');

    expect(await screen.findByRole('button', { name: /set budget/i })).toBeInTheDocument();

    unmount();
    vi.unstubAllGlobals();
    renderBudget('member');

    expect(await screen.findByRole('heading', { name: /budget/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /set budget/i })).not.toBeInTheDocument();
  });
});
