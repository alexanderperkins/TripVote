import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { fetchActivities } from '../api/itinerary.js';
import { ApiError } from '../api/client.js';
import { removeMember } from '../api/members.js';
import { deleteTrip, fetchTrip, updateTrip } from '../api/trips.js';
import Button from '../components/Button.jsx';
import LoadingState from '../components/LoadingState.jsx';
import TextField from '../components/TextField.jsx';
import TripHeader from '../components/TripHeader.jsx';
import FormError from '../features/auth/FormError.jsx';
import TripPeople from '../features/members/TripPeople.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { topActivities } from '../lib/activities.js';
import { isEndBeforeStart } from '../lib/dates.js';
import { formatDayLabel } from '../lib/trips.js';

const FALLBACK_ERROR = 'Something went wrong. Please try again.';

function errorMessage(error) {
  return error instanceof ApiError ? error.message : FALLBACK_ERROR;
}

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
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [favorites, setFavorites] = useState([]);

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
          setLoadError(errorMessage(error));
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    // Group favorites are a bonus: if they fail to load, the rest of the page still works.
    async function loadFavorites() {
      try {
        const activities = await fetchActivities(tripId);
        if (isCurrent) setFavorites(topActivities(activities));
      } catch {
        if (isCurrent) setFavorites([]);
      }
    }

    loadTrip();
    loadFavorites();
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
      setFormError(errorMessage(error));
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
      setFormError(errorMessage(error));
      setIsSaving(false);
    }
  }

  function showError(error) {
    setFormError(error ? errorMessage(error) : '');
  }

  async function handleLeave() {
    if (!window.confirm('Leave this trip? You will need a new invite to rejoin.')) return;
    setFormError('');
    setIsSaving(true);
    try {
      await removeMember(tripId, user.id);
      navigate('/trips');
    } catch (error) {
      showError(error);
      setIsSaving(false);
    }
  }

  async function handleCopyLink() {
    setFormError('');
    setIsCopied(false);
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/join/${encodeURIComponent(trip.shareCode)}`,
      );
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setFormError('Unable to copy the invite link. Please copy it from your browser address bar.');
    }
  }

  if (isLoading) return <LoadingState label="Loading trip…" />;
  if (loadError) return <FormError message={loadError} />;
  if (!trip || !values) return null;

  const isOrganizer = trip.role === 'organizer';

  const shareUrl = `${window.location.origin}/join/${encodeURIComponent(trip.shareCode ?? '')}`;

  return (
    <section className="flex flex-col gap-6">
      <TripHeader trip={trip} />

      <FormError message={formError} />

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <section
            aria-labelledby="invite-heading"
            className="flex flex-col gap-3 rounded-card bg-primary-soft p-5"
          >
            <h2 id="invite-heading" className="text-lg font-bold text-ink">
              Invite friends
            </h2>
            <p className="text-sm text-muted">
              Anyone with this link sees the trip basics and can ask to join.
              {isOrganizer ? ' You decide who gets in.' : ' The organizer approves requests.'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                {shareUrl}
              </code>
              <Button onClick={handleCopyLink}>Copy link</Button>
              {isCopied && (
                <p role="status" className="text-sm font-semibold text-success">
                  Copied
                </p>
              )}
            </div>
          </section>

          <TripPeople trip={trip} onTripChange={setTrip} onError={showError} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section
            aria-labelledby="favorites-heading"
            className="flex flex-col gap-3 rounded-card border border-border bg-card p-5"
          >
            <h2 id="favorites-heading" className="text-lg font-bold text-ink">
              Group favorites
            </h2>
            {favorites.length > 0 ? (
              <div className="flex flex-col gap-3">
                {favorites.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3">
                    <span className="shrink-0 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-bold text-warning-text tabular-nums">
                      {activity.votes.count} {activity.votes.count === 1 ? 'vote' : 'votes'}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{activity.title}</span>
                      <span className="block text-sm text-muted">
                        {formatDayLabel(activity.date)} · {activity.time}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                Add activities and vote on them; the most popular ones show up here.
              </p>
            )}
            <Link
              to={`/trips/${tripId}/itinerary`}
              className="text-sm font-bold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
            >
              See all activities<span aria-hidden="true"> →</span>
            </Link>
          </section>

          <section
            aria-labelledby="settings-heading"
            className="flex flex-col gap-3 rounded-card border border-border bg-card p-5"
          >
            <h2 id="settings-heading" className="text-lg font-bold text-ink">
              Trip settings
            </h2>
            <div className="flex flex-wrap gap-3">
              {isOrganizer && (
                <>
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
                  <Button variant="danger" disabled={isSaving} onClick={handleDelete}>
                    Delete
                  </Button>
                </>
              )}
              {!isOrganizer && (
                <Button variant="danger" disabled={isSaving} onClick={handleLeave}>
                  Leave trip
                </Button>
              )}
            </div>

            {isOrganizer && isEditing && (
              <form noValidate onSubmit={handleUpdate} className="flex flex-col gap-4">
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
          </section>
        </div>
      </div>
    </section>
  );
}
