import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/client.js';
import { deleteTrip, fetchTrip, updateTrip } from '../api/trips.js';
import Button from '../components/Button.jsx';
import LoadingState from '../components/LoadingState.jsx';
import TextField from '../components/TextField.jsx';
import FormError from '../features/auth/FormError.jsx';
import { isEndBeforeStart } from '../lib/dates.js';

function tripFields(trip) {
  return {
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
  };
}

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadTrip() {
      try {
        const result = await fetchTrip(tripId);
        if (isCurrent) {
          setTrip(result);
          setValues(tripFields(result));
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

    loadTrip();
    return () => {
      isCurrent = false;
    };
  }, [tripId]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  }

  async function handleUpdate(event) {
    event.preventDefault();
    const errors = {};
    if (!values.name.trim()) errors.name = 'Enter a trip name.';
    if (!values.destination.trim()) errors.destination = 'Enter a destination.';
    if (!values.startDate) errors.startDate = 'Enter a start date.';
    if (!values.endDate) errors.endDate = 'Enter an end date.';
    if (isEndBeforeStart(values.startDate, values.endDate)) {
      errors.endDate = "End date can't be before the start date.";
    }
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      const updatedTrip = await updateTrip(tripId, {
        ...values,
        name: values.name.trim(),
        destination: values.destination.trim(),
      });
      setTrip((current) => ({ ...current, ...updatedTrip }));
      setIsEditing(false);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this trip? This action cannot be undone.')) return;
    setFormError('');
    setIsSaving(true);
    try {
      await deleteTrip(tripId);
      navigate('/trips');
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState label="Loading trip…" />;
  if (loadError) return <FormError message={loadError} />;
  if (!trip || !values) return null;

  const isOrganizer = trip.role === 'organizer';

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{trip.name}</h1>
          <p className="mt-1 text-muted">{trip.destination}</p>
          <p className="mt-2 text-sm text-muted">
            {trip.startDate} – {trip.endDate}
          </p>
        </div>
        <span className="rounded-full bg-page px-3 py-1 text-sm font-semibold capitalize">
          {trip.role}
        </span>
      </div>

      <FormError message={formError} />

      {isOrganizer && (
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            disabled={isSaving}
            onClick={() => {
              setValues(tripFields(trip));
              setFieldErrors({});
              setFormError('');
              setIsEditing((current) => !current);
            }}
          >
            {isEditing ? 'Cancel edit' : 'Edit'}
          </Button>
          <Button variant="secondary" disabled={isSaving} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      )}

      {isOrganizer && isEditing && (
        <form
          noValidate
          onSubmit={handleUpdate}
          className="mt-6 flex flex-col gap-4 rounded-card border border-border bg-card p-6"
        >
          <TextField
            label="Name"
            name="name"
            value={values.name}
            onChange={handleChange}
            error={fieldErrors.name}
          />
          <TextField
            label="Destination"
            name="destination"
            value={values.destination}
            onChange={handleChange}
            error={fieldErrors.destination}
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
            Save changes
          </Button>
        </form>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold">Members</h2>
        {trip.members.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-card border border-border bg-card px-4">
            {trip.members.map((member) => (
              <li
                key={member.userId}
                className="flex min-h-14 items-center justify-between gap-3 py-3"
              >
                <span>{member.name}</span>
                <span className="text-sm capitalize text-muted">{member.role}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted">No members yet.</p>
        )}
      </section>
    </section>
  );
}
