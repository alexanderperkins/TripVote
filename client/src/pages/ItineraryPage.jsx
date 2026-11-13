import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ApiError } from '../api/client.js';
import { fetchTrip } from '../api/trips.js';
import { addVote, fetchActivities, deleteActivity, removeVote } from '../api/itinerary.js';
import Button from '../components/Button.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import FormError from '../features/auth/FormError.jsx';
import AddActivityForm from '../features/itinerary/AddActivityForm.jsx';
import EditActivityForm from '../features/itinerary/EditActivityForm.jsx';
import VoteButton from '../features/itinerary/VoteButton.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useTripSocket } from '../hooks/useTripSocket.js';
import { applyVotes, removeActivity, upsertActivity } from '../lib/activities.js';
import { toggleVote } from '../lib/votes.js';

export default function ItineraryPage() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadData() {
      try {
        const [tripData, activitiesData] = await Promise.all([
          fetchTrip(tripId),
          fetchActivities(tripId),
        ]);
        if (isCurrent) {
          setTrip(tripData);
          setActivities(activitiesData);
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

    loadData();
    return () => {
      isCurrent = false;
    };
  }, [tripId]);

  const userId = user?.id;
  const liveStatus = useTripSocket(
    tripId,
    {
      'activity:created': (activity) =>
        setActivities((current) => upsertActivity(current, activity, userId)),
      'activity:updated': (activity) =>
        setActivities((current) => upsertActivity(current, activity, userId)),
      'activity:deleted': ({ id }) => setActivities((current) => removeActivity(current, id)),
      'activity:votes': ({ id, votes }) =>
        setActivities((current) => applyVotes(current, id, votes, userId)),
    },
    useCallback(async () => {
      try {
        setActivities(await fetchActivities(tripId));
      } catch {
        // Keep what is on screen; the next live event or a reload will catch up.
      }
    }, [tripId]),
  );

  async function handleDelete(activityId) {
    if (!window.confirm('Delete this activity?')) return;
    setActionError('');
    try {
      await deleteActivity(tripId, activityId);
      setActivities((current) => current.filter((a) => a.id !== activityId));
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    }
  }

  function setActivityVotes(activityId, votes) {
    setActivities((current) => current.map((a) => (a.id === activityId ? { ...a, votes } : a)));
  }

  async function handleToggleVote(activity) {
    const previousVotes = activity.votes;
    const wasVoted = Boolean(previousVotes?.hasVoted);
    setActionError('');
    setActivityVotes(activity.id, toggleVote(previousVotes, user));
    try {
      const updated = wasVoted
        ? await removeVote(tripId, activity.id)
        : await addVote(tripId, activity.id);
      setActivityVotes(activity.id, updated.votes);
    } catch (error) {
      setActivityVotes(activity.id, previousVotes);
      setActionError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    }
  }

  if (isLoading) return <LoadingState label="Loading itinerary…" />;
  if (loadError) return <FormError message={loadError} />;
  if (!trip) return null;

  const isOrganizer = trip.role === 'organizer';
  const currentMember =
    trip.members?.find((m) => m.userId === user?.id && m.role === trip.role) ||
    trip.members?.find((m) => m.role === trip.role);
  const currentUserId = currentMember?.userId ?? user?.id;

  function canManage(activity) {
    if (isOrganizer) return true;
    return activity.addedBy?.userId === currentUserId;
  }

  const sortedActivities = [...activities].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  const groupedByDay = sortedActivities.reduce((acc, activity) => {
    acc[activity.date] ??= [];
    acc[activity.date].push(activity);
    return acc;
  }, {});

  const days = Object.keys(groupedByDay).sort();
  const seenUsers = new Set();

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Itinerary</h1>
          <p className="mt-1 text-muted">
            {trip.name} – {trip.destination}
          </p>
          <p className="mt-2 text-sm text-muted">
            {trip.startDate} – {trip.endDate}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-page px-3 py-1 text-sm font-semibold capitalize">
            {trip.role}
          </span>
          <ConnectionStatus status={liveStatus} />
        </div>
      </div>

      <FormError message={actionError} />

      <div className="mt-6">
        <AddActivityForm
          tripId={tripId}
          onCreated={(newActivity) =>
            setActivities((current) => upsertActivity(current, newActivity, userId))
          }
        />
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {days.length > 0 ? (
          days.map((day) => (
            <section key={day} className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-ink">{day}</h2>
              <div className="flex flex-col gap-3">
                {groupedByDay[day].map((activity) => {
                  const isFirstAuthor =
                    activity.addedBy?.userId && !seenUsers.has(activity.addedBy.userId);
                  if (activity.addedBy?.userId) {
                    seenUsers.add(activity.addedBy.userId);
                  }

                  return editingId === activity.id ? (
                    <EditActivityForm
                      key={activity.id}
                      tripId={tripId}
                      activity={activity}
                      onSaved={(updated) => {
                        setActivities((current) =>
                          current.map((a) => (a.id === updated.id ? updated : a)),
                        );
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <article
                      key={activity.id}
                      className="flex flex-col gap-2 rounded-card border border-border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-ink">{activity.title}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
                            <span>{activity.time}</span>
                            {activity.location && <span>{activity.location}</span>}
                          </div>
                        </div>
                        {canManage(activity) && (
                          <div className="flex items-center gap-2">
                            <Button variant="secondary" onClick={() => setEditingId(activity.id)}>
                              Edit
                            </Button>
                            <Button variant="secondary" onClick={() => handleDelete(activity.id)}>
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>

                      {activity.notes && <p className="text-sm text-muted">{activity.notes}</p>}

                      <VoteButton
                        activityTitle={activity.title}
                        votes={activity.votes}
                        onToggle={() => handleToggleVote(activity)}
                      />

                      {activity.addedBy?.name && (
                        <div className="text-xs text-muted">
                          {isFirstAuthor ? (
                            <span>{activity.addedBy.name}</span>
                          ) : (
                            <span>Added by {activity.addedBy.name}</span>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-card border border-border bg-card p-8 text-center">
            <p className="font-semibold text-ink">No activities yet</p>
            <p className="mt-1 text-muted">Add your first activity using the form above.</p>
          </div>
        )}
      </div>
    </section>
  );
}
