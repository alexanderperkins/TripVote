import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { ApiError } from '../api/client.js';
import { fetchTrip } from '../api/trips.js';
import { addVote, fetchActivities, deleteActivity, removeVote } from '../api/itinerary.js';
import Button from '../components/Button.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import LoadingState from '../components/LoadingState.jsx';
import Modal from '../components/Modal.jsx';
import TripHeader from '../components/TripHeader.jsx';
import FormError from '../features/auth/FormError.jsx';
import ActivityCard from '../features/itinerary/ActivityCard.jsx';
import AddActivityForm from '../features/itinerary/AddActivityForm.jsx';
import EditActivityForm from '../features/itinerary/EditActivityForm.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { useTripSocket } from '../hooks/useTripSocket.js';
import {
  applyVotes,
  favoriteIds,
  groupByDay,
  newVoters,
  removeActivity,
  upsertActivity,
} from '../lib/activities.js';
import { formatDayLabel, todayIso, tripDays } from '../lib/trips.js';
import { toggleVote } from '../lib/votes.js';

const FALLBACK_ERROR = 'Something went wrong. Please try again.';
const UNDO_WINDOW_MS = 5000;
const HIGHLIGHT_MS = 1800;

function errorMessage(error) {
  return error instanceof ApiError ? error.message : FALLBACK_ERROR;
}

export default function ItineraryPage() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const showToast = useToast();
  const [trip, setTrip] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [onlyNotVoted, setOnlyNotVoted] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState(() => new Set());
  const [highlighted, setHighlighted] = useState(() => new Set());
  const activitiesRef = useRef(activities);
  const deleteTimers = useRef(new Map());

  useEffect(() => {
    activitiesRef.current = activities;
  });

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
        if (isCurrent) setLoadError(errorMessage(error));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isCurrent = false;
    };
  }, [tripId]);

  // Deletes still inside their undo window go through when the person leaves the page.
  useEffect(() => {
    const timers = deleteTimers.current;
    return () => {
      for (const [activityId, timer] of timers) {
        window.clearTimeout(timer);
        deleteActivity(tripId, activityId).catch(() => {});
      }
      timers.clear();
    };
  }, [tripId]);

  const highlight = useCallback((activityId) => {
    setHighlighted((current) => new Set(current).add(activityId));
    window.setTimeout(() => {
      setHighlighted((current) => {
        const next = new Set(current);
        next.delete(activityId);
        return next;
      });
    }, HIGHLIGHT_MS);
  }, []);

  const userId = user?.id;
  const liveStatus = useTripSocket(
    tripId,
    {
      'activity:created': (activity) => {
        const isNew = !activitiesRef.current.some((a) => a.id === activity.id);
        setActivities((current) => upsertActivity(current, activity, userId));
        if (isNew && activity.addedBy?.userId !== userId) {
          highlight(activity.id);
          showToast(`${activity.addedBy?.name ?? 'Someone'} added ${activity.title}`);
        }
      },
      'activity:updated': (activity) => {
        setActivities((current) => upsertActivity(current, activity, userId));
      },
      'activity:deleted': ({ id }) => setActivities((current) => removeActivity(current, id)),
      'activity:votes': ({ id, votes }) => {
        const previous = activitiesRef.current.find((a) => a.id === id);
        const joined = previous ? newVoters(previous.votes, votes, userId) : [];
        setActivities((current) => applyVotes(current, id, votes, userId));
        if (joined.length > 0) {
          highlight(id);
          showToast(`${joined.map((voter) => voter.name).join(', ')} voted for ${previous.title}`);
        }
      },
    },
    useCallback(async () => {
      try {
        setActivities(await fetchActivities(tripId));
      } catch {
        // Keep what is on screen; the next live event or a reload will catch up.
      }
    }, [tripId]),
  );

  function finishDelete(activityId) {
    deleteTimers.current.delete(activityId);
    setPendingDeletes((current) => {
      const next = new Set(current);
      next.delete(activityId);
      return next;
    });
  }

  function handleDelete(activity) {
    setActionError('');
    setPendingDeletes((current) => new Set(current).add(activity.id));
    const timer = window.setTimeout(async () => {
      try {
        await deleteActivity(tripId, activity.id);
        setActivities((current) => removeActivity(current, activity.id));
      } catch (error) {
        setActionError(errorMessage(error));
      } finally {
        finishDelete(activity.id);
      }
    }, UNDO_WINDOW_MS);
    deleteTimers.current.set(activity.id, timer);
    showToast(`Deleted ${activity.title}`, {
      actionLabel: 'Undo',
      duration: UNDO_WINDOW_MS,
      onAction: () => {
        window.clearTimeout(deleteTimers.current.get(activity.id));
        finishDelete(activity.id);
      },
    });
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
      setActionError(errorMessage(error));
    }
  }

  // A new activity starts with its author's vote, so others can see who wants it.
  async function handleCreated(created) {
    setIsAdding(false);
    setActivities((current) => upsertActivity(current, created, userId));
    setSelectedDay(created.date);
    highlight(created.id);
    try {
      const updated = await addVote(tripId, created.id);
      setActivities((current) => applyVotes(current, created.id, updated.votes, userId));
    } catch {
      // The activity is saved; the person can still vote on it by hand.
    }
  }

  function jumpToDay(day) {
    setSelectedDay(day);
    document.getElementById(`day-${day}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  if (isLoading) return <LoadingState label="Loading itinerary…" />;
  if (loadError) return <FormError message={loadError} />;
  if (!trip) return null;

  const isOrganizer = trip.role === 'organizer';
  const currentMember =
    trip.members?.find((m) => m.userId === user?.id && m.role === trip.role) ||
    trip.members?.find((m) => m.role === trip.role);
  const currentUserId = currentMember?.userId ?? user?.id;
  const memberCount = trip.members?.length ?? 0;

  function canManage(activity) {
    if (isOrganizer) return true;
    return activity.addedBy?.userId === currentUserId;
  }

  const visible = activities.filter((a) => !pendingDeletes.has(a.id));
  const notVotedCount = visible.filter((a) => !a.votes?.hasVoted).length;
  const days = groupByDay(visible, tripDays(trip.startDate, trip.endDate));
  const favorites = favoriteIds(visible);
  const today = todayIso();
  const defaultDay =
    selectedDay || days.find((d) => d.date >= today)?.date || days[0]?.date || trip.startDate;

  return (
    <section className="flex flex-col gap-6 pb-24">
      <TripHeader trip={trip} status={<ConnectionStatus status={liveStatus} tone="cover" />} />

      <FormError message={actionError} />

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-8 text-center">
          <p className="font-semibold text-ink">No activities yet</p>
          <p className="text-muted">Suggest the first thing to do and your group can vote on it.</p>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 bg-page/95 px-4 py-2 backdrop-blur">
            <nav aria-label="Days" className="flex min-w-0 gap-2 overflow-x-auto pb-1">
              {days.map((day, index) => (
                <button
                  key={day.date}
                  type="button"
                  aria-pressed={day.date === defaultDay}
                  onClick={() => jumpToDay(day.date)}
                  className={`flex min-h-14 shrink-0 flex-col items-start justify-center rounded-xl border px-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    day.date === defaultDay
                      ? 'border-ink bg-ink text-white'
                      : 'border-border bg-card text-ink hover:border-primary'
                  }`}
                >
                  <span className="text-sm font-bold">Day {index + 1}</span>
                  <span
                    className={`text-xs ${
                      day.date === defaultDay
                        ? 'text-white/85'
                        : day.activities.length
                          ? 'text-muted'
                          : 'font-bold text-warning-text'
                    }`}
                  >
                    {formatDayLabel(day.date)} ·{' '}
                    {day.activities.length ? `${day.activities.length} planned` : 'Nothing yet'}
                  </span>
                </button>
              ))}
            </nav>
            <div
              role="group"
              aria-label="Filter activities"
              className="flex rounded-xl border border-border bg-card p-1"
            >
              <button
                type="button"
                aria-pressed={!onlyNotVoted}
                onClick={() => setOnlyNotVoted(false)}
                className={`min-h-10 rounded-lg px-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  onlyNotVoted ? 'text-muted' : 'bg-primary-soft text-primary'
                }`}
              >
                All
              </button>
              <button
                type="button"
                aria-pressed={onlyNotVoted}
                onClick={() => setOnlyNotVoted(true)}
                className={`min-h-10 rounded-lg px-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  onlyNotVoted ? 'bg-primary-soft text-primary' : 'text-muted'
                }`}
              >
                Not voted ({notVotedCount})
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            {days.map((day, index) => {
              const shown = onlyNotVoted
                ? day.activities.filter((a) => !a.votes?.hasVoted)
                : day.activities;
              return (
                <section
                  key={day.date}
                  id={`day-${day.date}`}
                  aria-labelledby={`day-${day.date}-heading`}
                  className="flex scroll-mt-24 flex-col gap-3"
                >
                  <h2 id={`day-${day.date}-heading`} className="text-lg font-bold text-ink">
                    Day {index + 1} · {formatDayLabel(day.date)}
                  </h2>
                  {shown.length === 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-border px-4 py-3">
                      <p className="text-sm text-muted">
                        {day.activities.length
                          ? 'You’ve voted on everything this day.'
                          : 'Nothing planned yet.'}
                      </p>
                      {!day.activities.length && (
                        <Button
                          variant="secondary"
                          aria-label={`Suggest an activity for day ${index + 1}`}
                          onClick={() => {
                            setSelectedDay(day.date);
                            setIsAdding(true);
                          }}
                        >
                          Suggest one
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {shown.map((activity) =>
                        editingId === activity.id ? (
                          <div key={activity.id} className="pb-3">
                            <EditActivityForm
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
                          </div>
                        ) : (
                          <ActivityCard
                            key={activity.id}
                            activity={activity}
                            memberCount={memberCount}
                            isFavorite={favorites.has(activity.id)}
                            isHighlighted={highlighted.has(activity.id)}
                            canManage={canManage(activity)}
                            onEdit={() => setEditingId(activity.id)}
                            onDelete={() => handleDelete(activity)}
                            onToggleVote={() => handleToggleVote(activity)}
                          />
                        ),
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      {isAdding ? (
        <Modal title="Add activity" onClose={() => setIsAdding(false)}>
          <AddActivityForm
            tripId={tripId}
            defaultDate={defaultDay}
            onCreated={handleCreated}
            onCancel={() => setIsAdding(false)}
          />
        </Modal>
      ) : (
        <Button
          className="fixed right-5 bottom-5 z-30 min-h-13 rounded-full px-6 shadow-lg"
          onClick={() => setIsAdding(true)}
        >
          <span aria-hidden="true">+&nbsp;</span>Add activity
        </Button>
      )}
    </section>
  );
}
