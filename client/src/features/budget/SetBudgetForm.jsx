import { useState } from 'react';
import { ApiError } from '../../api/client.js';
import { setBudget } from '../../api/budget.js';
import Button from '../../components/Button.jsx';
import TextField from '../../components/TextField.jsx';
import FormError from '../auth/FormError.jsx';
import { parseDollarsToCents } from '../../lib/money.js';

export default function SetBudgetForm({ tripId, budget, onBudgetSaved }) {
  const [values, setValues] = useState({
    total: budget?.totalCents ? (budget.totalCents / 100).toFixed(2) : '',
    lodging: '',
    food: '',
    transport: '',
    activities: '',
    other: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = {};
    const totalCents = parseDollarsToCents(values.total);
    if (totalCents === null) {
      errors.total = 'Enter a positive amount with up to two decimals.';
    }

    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      const categories = {
        lodging: parseDollarsToCents(values.lodging) ?? 0,
        food: parseDollarsToCents(values.food) ?? 0,
        transport: parseDollarsToCents(values.transport) ?? 0,
        activities: parseDollarsToCents(values.activities) ?? 0,
        other: parseDollarsToCents(values.other) ?? 0,
      };

      await setBudget(tripId, { totalCents, categories });
      setFieldErrors({});
      onBudgetSaved?.();
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
      <h2 className="text-xl font-bold text-ink">Set budget</h2>
      <FormError message={formError} />

      <TextField
        label="Total budget"
        name="total"
        value={values.total}
        onChange={handleChange}
        placeholder="0.00"
        error={fieldErrors.total}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <TextField
          label="Lodging"
          name="lodging"
          value={values.lodging}
          onChange={handleChange}
          placeholder="0.00"
        />
        <TextField
          label="Food"
          name="food"
          value={values.food}
          onChange={handleChange}
          placeholder="0.00"
        />
        <TextField
          label="Transport"
          name="transport"
          value={values.transport}
          onChange={handleChange}
          placeholder="0.00"
        />
        <TextField
          label="Activities"
          name="activities"
          value={values.activities}
          onChange={handleChange}
          placeholder="0.00"
        />
        <TextField
          label="Other"
          name="other"
          value={values.other}
          onChange={handleChange}
          placeholder="0.00"
        />
      </div>

      <div>
        <Button type="submit" disabled={isSaving}>
          Set budget
        </Button>
      </div>
    </form>
  );
}
