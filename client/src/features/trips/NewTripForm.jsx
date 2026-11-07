import { useState } from 'react';
import { ApiError } from '../../api/client.js';
import { createTrip } from '../../api/trips.js';
import Button from '../../components/Button.jsx';
import TextField from '../../components/TextField.jsx';
import FormError from '../auth/FormError.jsx';
import { isEndBeforeStart } from '../../lib/dates.js';

const INITIAL_VALUES = {
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
};

const DATE_ORDER_ERROR = "End date can't be before the start date.";

export default function NewTripForm({ onCreated }) {
  const [values, setValues] = useState(INITIAL_VALUES);
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
    if (!values.name.trim()) errors.name = 'Enter a trip name.';
    if (!values.destination.trim()) errors.destination = 'Enter a destination.';
    if (!values.startDate) errors.startDate = 'Enter a start date.';
    if (!values.endDate) errors.endDate = 'Enter an end date.';
    if (isEndBeforeStart(values.startDate, values.endDate)) {
      errors.endDate = DATE_ORDER_ERROR;
    }

    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      const trip = await createTrip({
        ...values,
        name: values.name.trim(),
        destination: values.destination.trim(),
      });
      setValues(INITIAL_VALUES);
      setFieldErrors({});
      await onCreated?.(trip);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormError message={formError} />
      <TextField
        label="Name"
        name="name"
        value={values.name}
        onChange={handleChange}
        error={fieldErrors.name}
        autoComplete="off"
      />
      <TextField
        label="Destination"
        name="destination"
        value={values.destination}
        onChange={handleChange}
        error={fieldErrors.destination}
        autoComplete="off"
      />
      <TextField
        label="Start date"
        name="startDate"
        type="date"
        value={values.startDate}
        onChange={handleChange}
        error={fieldErrors.startDate}
      />
      <TextField
        label="End date"
        name="endDate"
        type="date"
        value={values.endDate}
        onChange={handleChange}
        error={fieldErrors.endDate}
      />
      <Button type="submit" disabled={isSaving}>
        Create trip
      </Button>
    </form>
  );
}
