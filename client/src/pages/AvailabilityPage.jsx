import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { fetchAvailability, saveMyAvailability } from '../api/availability.js';
import { ApiError } from '../api/client.js';
import { fetchTrip } from '../api/trips.js';
import Button from '../components/Button.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import LoadingState from '../components/LoadingState.jsx';
import TripHeader from '../components/TripHeader.jsx';
import FormError from '../features/auth/FormError.jsx';
import BestDates from '../features/availability/BestDates.jsx';
import DayGrid, { HeatLegend } from '../features/availability/DayGrid.jsx';
import WaitingList from '../features/availability/WaitingList.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { useTripSocket } from '../hooks/useTripSocket.js';
import { peopleWhoChanged, toggleDate, withMyDates } from '../lib/availability.js';

const FALLBACK_ERROR = 'Something went wrong. Please try again.';
const SAVE_LABELS = { saving: 'Saving…', saved: 'Saved' };

function errorMessage(error) {
  return error instanceof ApiError ? error.message : FALLBACK_ERROR;
}

export default function AvailabilityPage() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const showToast = useToast();
  const [trip, setTrip] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveState, setSaveState] = useState('idle');
  const summaryRef = useRef(summary);
  // The last summary the server confirmed, to fall back to when a save fails.
  const confirmed = useRef(null);
  const latestSave = useRef(0);
  const savesInFlight = useRef(0);

  useEffect(() => {
    summaryRef.current = summary;
  });

  useEffect(() => {
    let isCurrent = true;

    async function loadData() {
      try {
        const [tripData, availability] = await Promise.all([
          fetchTrip(tripId),
          fetchAvailability(tripId),
        ]);
        if (isCurrent) {
          confirmed.current = availability;
          setTrip(tripData);
          setSummary(availability);
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

  const userId = user?.id;
  const liveStatus = useTripSocket(
    tripId,
    {
      'availability:updated': (next) => {
        confirmed.current = next;
        // While our own save is on its way, its reply brings everyone's latest days.
        if (savesInFlight.current > 0) return;
        const previous = summaryRef.current;
        setSummary(next);
        const changed = previous ? peopleWhoChanged(previous, next, userId) : [];
        if (changed.length > 0) {
          showToast(`${changed.map((p) => p.name).join(', ')} updated their free days`);
        }
      },
    },
    useCallback(async () => {
      try {
        const next = await fetchAvailability(tripId);
        confirmed.current = next;
        setSummary(next);
      } catch {
        // Keep what is on screen; the next live event or a reload will catch up.
      }
    }, [tripId]),
  );

  if (isLoading) return <LoadingState label="Loading availability…" />;
  if (loadError) return <FormError message={loadError} />;
  if (!trip || !summary) return null;

  const me = { userId, name: user?.name };
  const myDates = summary.responses.find((r) => r.userId === userId)?.dates ?? [];

  async function save(dates) {
    const saveId = latestSave.current + 1;
    latestSave.current = saveId;
    savesInFlight.current += 1;
    setSaveError('');
    setSaveState('saving');
    setSummary((current) => withMyDates(current, me, dates));
    try {
      const saved = await saveMyAvailability(tripId, dates);
      confirmed.current = saved;
      if (saveId === latestSave.current) {
        setSummary(saved);
        setSaveState('saved');
      }
    } catch (error) {
      if (saveId === latestSave.current) {
        setSummary(confirmed.current);
        setSaveState('idle');
        setSaveError(errorMessage(error));
      }
    } finally {
      savesInFlight.current -= 1;
    }
  }

  return (
    <section className="flex flex-col gap-6 pb-12">
      <TripHeader trip={trip} status={<ConnectionStatus status={liveStatus} tone="cover" />} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section
          aria-labelledby="free-days-heading"
          className="flex flex-col gap-4 rounded-card border border-border bg-card p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="free-days-heading" className="text-lg font-bold">
                When are you free?
              </h2>
              <p className="text-sm text-muted">
                Tap the days you can make it. Darker days work for more of the group.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span role="status" className="text-sm font-semibold text-muted">
                {SAVE_LABELS[saveState] ?? ''}
              </span>
              {myDates.length > 0 && (
                <Button variant="secondary" onClick={() => save([])}>
                  Clear my days
                </Button>
              )}
            </div>
          </div>

          <FormError message={saveError} />

          <DayGrid
            days={summary.days}
            myDates={myDates}
            bestDates={summary.bestDates}
            memberCount={summary.memberCount}
            onToggle={(date) => save(toggleDate(myDates, date))}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <HeatLegend />
            <p className="text-sm font-semibold text-muted">
              {myDates.length === 0
                ? "You haven't marked any days yet."
                : `You marked ${myDates.length} ${myDates.length === 1 ? 'day' : 'days'}.`}
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <BestDates summary={summary} />
          <WaitingList people={summary.notResponded} viewerId={userId} />
        </div>
      </div>
    </section>
  );
}
