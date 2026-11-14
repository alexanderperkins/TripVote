import { useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../../api/client.js';
import { createTrip, fetchTrip } from '../../api/trips.js';
import Button from '../../components/Button.jsx';
import TextField from '../../components/TextField.jsx';
import FormError from '../auth/FormError.jsx';
import { isEndBeforeStart } from '../../lib/dates.js';
import { suggestTripName } from '../../lib/trips.js';

const DATE_ORDER_ERROR = "End date can't be before the start date.";
const IDEAS = ['Lisbon, Portugal', 'Kyoto, Japan', 'Barcelona, Spain', 'Reykjavik, Iceland'];
const STEP_TITLES = ['Where are you going?', 'When?', 'Name your trip'];

// The "New trip" flow inside a dialog: destination, then dates, then name.
// After the trip is created it shows the share link so inviting friends is the next step.
export default function NewTripWizard({ onCreated, onClose }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ name: '', destination: '', startDate: '', endDate: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [copyState, setCopyState] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  }

  function errorsFor(currentStep) {
    const errors = {};
    if (currentStep === 0 && !values.destination.trim())
      errors.destination = 'Enter a destination.';
    if (currentStep === 1) {
      if (!values.startDate) errors.startDate = 'Enter a start date.';
      if (!values.endDate) errors.endDate = 'Enter an end date.';
      if (isEndBeforeStart(values.startDate, values.endDate)) errors.endDate = DATE_ORDER_ERROR;
    }
    if (currentStep === 2 && !values.name.trim()) errors.name = 'Enter a trip name.';
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = errorsFor(step);
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    if (step < 2) {
      if (step === 1 && !values.name) {
        setValues((current) => ({ ...current, name: suggestTripName(current.destination) }));
      }
      setStep(step + 1);
      return;
    }

    setIsSaving(true);
    try {
      const trip = await createTrip({
        ...values,
        name: values.name.trim(),
        destination: values.destination.trim(),
      });
      await onCreated?.(trip);
      let shareCode = '';
      try {
        shareCode = (await fetchTrip(trip.id)).shareCode ?? '';
      } catch {
        // The trip page shows the link too, so a missing link here is not a blocker.
      }
      setCreated({ ...trip, shareCode });
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (created) {
    const shareUrl = `${window.location.origin}/join/${encodeURIComponent(created.shareCode)}`;
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span
          aria-hidden="true"
          className="grid h-14 w-14 place-items-center rounded-full bg-success-soft text-2xl font-extrabold text-success"
        >
          ✓
        </span>
        <p className="text-lg font-bold text-ink">{created.name} is ready</p>
        <p className="text-muted">
          Next, invite your friends. They see the basics and ask to join; you approve them.
        </p>
        {created.shareCode && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-page px-3 py-2.5 text-left text-sm">
              {shareUrl}
            </code>
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopyState('Copied');
                } catch {
                  setCopyState('Select the link and copy it.');
                }
              }}
            >
              Copy link
            </Button>
          </div>
        )}
        {copyState && (
          <p role="status" className="text-sm font-semibold text-success">
            {copyState}
          </p>
        )}
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
          <Link
            to={`/trips/${created.id}`}
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Open trip
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-1.5" aria-hidden="true">
        {STEP_TITLES.map((title, index) => (
          <span
            key={title}
            className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-border'}`}
          />
        ))}
      </div>
      <p className="text-sm font-semibold text-muted">
        Step {step + 1} of 3 · {STEP_TITLES[step]}
      </p>
      <FormError message={formError} />

      {step === 0 && (
        <>
          <TextField
            label="Destination"
            name="destination"
            value={values.destination}
            onChange={handleChange}
            error={fieldErrors.destination}
            placeholder="City or region"
            autoFocus
            autoComplete="off"
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Popular places">
            {IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => {
                  setValues((current) => ({ ...current, destination: idea }));
                  setFieldErrors({});
                }}
                className="min-h-10 rounded-full border border-border px-3.5 text-sm font-semibold text-ink outline-none hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
              >
                {idea}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Start date"
              name="startDate"
              autoFocus
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
          </div>
          <p className="text-sm text-muted">Rough dates are fine. You can change them later.</p>
        </>
      )}

      {step === 2 && (
        <TextField
          label="Name"
          name="name"
          autoFocus
          value={values.name}
          onChange={handleChange}
          error={fieldErrors.name}
          autoComplete="off"
        />
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          variant="secondary"
          disabled={isSaving}
          onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {step === 2 ? 'Create trip' : 'Next'}
        </Button>
      </div>
    </form>
  );
}
