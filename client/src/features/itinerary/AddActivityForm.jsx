import { useState } from 'react';
import { ApiError } from '../../api/client.js';
import { createActivity } from '../../api/itinerary.js';
import Button from '../../components/Button.jsx';
import TextField from '../../components/TextField.jsx';
import FormError from '../auth/FormError.jsx';

const INITIAL_VALUES = {
  title: '',
  date: '',
  time: '',
  location: '',
  notes: '',
};

export default function AddActivityForm({ tripId, onCreated }) {
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
    if (!values.title.trim()) errors.title = 'Enter a title.';
    if (!values.date) errors.date = 'Enter a date.';
    if (!values.time) errors.time = 'Enter a time.';
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      const payload = {
        title: values.title.trim(),
        date: values.date,
        time: values.time,
      };
      if (values.location.trim()) payload.location = values.location.trim();
      if (values.notes.trim()) payload.notes = values.notes.trim();

      const created = await createActivity(tripId, payload);
      setValues(INITIAL_VALUES);
      setFieldErrors({});
      onCreated?.(created);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
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
      <h2 className="text-xl font-bold text-ink">Add activity</h2>
      <FormError message={formError} />
      <TextField
        label="Title"
        name="title"
        value={values.title}
        onChange={handleChange}
        required
        error={fieldErrors.title}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Date"
          name="date"
          type="date"
          value={values.date}
          onChange={handleChange}
          required
          error={fieldErrors.date}
        />
        <TextField
          label="Time"
          name="time"
          type="time"
          value={values.time}
          onChange={handleChange}
          required
          error={fieldErrors.time}
        />
      </div>
      <TextField
        label="Location"
        name="location"
        value={values.location}
        onChange={handleChange}
        error={fieldErrors.location}
      />
      <TextField
        label="Notes"
        name="notes"
        value={values.notes}
        onChange={handleChange}
        error={fieldErrors.notes}
      />
      <Button type="submit" disabled={isSaving}>
        Add activity
      </Button>
    </form>
  );
}
