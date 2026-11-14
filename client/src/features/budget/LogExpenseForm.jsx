import { useId, useState } from 'react';
import { ApiError } from '../../api/client.js';
import { createExpense } from '../../api/budget.js';
import Button from '../../components/Button.jsx';
import TextField from '../../components/TextField.jsx';
import FormError from '../auth/FormError.jsx';
import { parseDollarsToCents } from '../../lib/money.js';

const CATEGORIES = [
  { value: 'lodging', label: 'Accommodations' },
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'activities', label: 'Activities' },
  { value: 'other', label: 'Other' },
];

export default function LogExpenseForm({
  tripId,
  members = [],
  defaultPayerId = '',
  onExpenseLogged,
}) {
  const categoryId = useId();
  const paidById = useId();
  const splitAmongId = useId();

  const [values, setValues] = useState(() => ({
    description: '',
    amount: '',
    category: 'food',
    paidBy: defaultPayerId || members[0]?.userId || '',
  }));
  const [splitAmong, setSplitAmong] = useState(() => members.map((m) => m.userId));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  }

  function toggleSplitMember(userId) {
    setSplitAmong((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
    setFieldErrors((current) => ({ ...current, splitAmong: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = {};
    if (!values.description.trim()) {
      errors.description = 'Enter a description.';
    }
    const amountCents = parseDollarsToCents(values.amount);
    if (amountCents === null) {
      errors.amount = 'Enter a positive amount with up to two decimals.';
    }
    if (splitAmong.length === 0) {
      errors.splitAmong = 'Select at least one member to split among.';
    }

    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      await createExpense(tripId, {
        description: values.description.trim(),
        amountCents,
        category: values.category,
        paidBy: values.paidBy || defaultPayerId || members[0]?.userId,
        splitAmong,
      });

      setValues({
        description: '',
        amount: '',
        category: 'food',
        paidBy: defaultPayerId || members[0]?.userId || '',
      });
      setSplitAmong(members.map((m) => m.userId));
      setFieldErrors({});
      onExpenseLogged?.();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-card border border-border bg-card p-6"
    >
      <h2 className="text-xl font-bold text-ink">Log expense</h2>
      <FormError message={formError} />

      <TextField
        label="What"
        name="description"
        value={values.description}
        onChange={handleChange}
        error={fieldErrors.description}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Amount"
          name="amount"
          value={values.amount}
          onChange={handleChange}
          placeholder="0.00"
          error={fieldErrors.amount}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor={categoryId} className="text-sm font-semibold text-ink">
            Category
          </label>
          <select
            id={categoryId}
            name="category"
            value={values.category}
            onChange={handleChange}
            className="min-h-11 rounded-lg border border-border bg-card px-3 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={paidById} className="text-sm font-semibold text-ink">
            Paid by
          </label>
          <select
            id={paidById}
            name="paidBy"
            value={values.paidBy}
            onChange={handleChange}
            className="min-h-11 rounded-lg border border-border bg-card px-3 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name} ({m.role || 'member'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <fieldset
          id={splitAmongId}
          aria-label="Split among"
          className="flex flex-col gap-2 border-0 p-0"
        >
          <legend className="text-sm font-semibold text-ink">Split among</legend>
          <div className="flex flex-wrap gap-4">
            {members.map((m) => (
              <label
                key={m.userId}
                className="flex cursor-pointer items-center gap-2 text-sm text-ink"
              >
                <input
                  type="checkbox"
                  checked={splitAmong.includes(m.userId)}
                  onChange={() => toggleSplitMember(m.userId)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span>
                  {m.name} ({m.role || 'member'})
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {fieldErrors.splitAmong && (
          <p role="alert" className="text-sm text-danger">
            {fieldErrors.splitAmong}
          </p>
        )}
      </div>

      <div>
        <Button type="submit" disabled={isSaving}>
          Log expense
        </Button>
      </div>
    </form>
  );
}
