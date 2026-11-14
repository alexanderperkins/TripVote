import { useState } from 'react';
import { ApiError } from '../../api/client.js';
import { updateActivity } from '../../api/itinerary.js';
import Button from '../../components/Button.jsx';
import TextField from '../../components/TextField.jsx';
import FormError from '../auth/FormError.jsx';

export default function EditActivityForm({ tripId, activity, onSaved, onCancel }) {
  const [values, setValues] = useState({
    title: activity.title,
    date: activity.date,
    time: activity.time,
    location: activity.location ?? '',
    notes: activity.notes ?? '',
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
        location: values.location.trim() || undefined,
        notes: values.notes.trim() || undefined,
      };
      const updated = await updateActivity(tripId, activity.id, payload);
      onSaved(updated);
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
      className="flex flex-col gap-3 rounded-card border border-border bg-card p-4"
    >
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
      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving}>
          Save
        </Button>
        <Button variant="secondary" disabled={isSaving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
