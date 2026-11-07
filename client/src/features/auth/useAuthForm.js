import { useState } from 'react';
import { ApiError } from '../../api/client.js';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

// Form state for the auth forms: client-side validation first, then server errors
// shown next to their field (fieldErrors) or above the form (formError).
export function useAuthForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validate(values);
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setFieldErrors(err.fields);
      } else {
        setFormError(err instanceof ApiError ? err.message : FALLBACK_MESSAGE);
      }
      setIsSaving(false);
    }
  }

  return { values, fieldErrors, formError, isSaving, handleChange, handleSubmit };
}
