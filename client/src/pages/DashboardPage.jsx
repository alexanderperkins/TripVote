import { useEffect, useState } from 'react';
import { ApiError } from '../api/client.js';
import { fetchTrips } from '../api/trips.js';
import Button from '../components/Button.jsx';
import LoadingState from '../components/LoadingState.jsx';
import Modal from '../components/Modal.jsx';
import FormError from '../features/auth/FormError.jsx';
import NewTripWizard from '../features/trips/NewTripWizard.jsx';
import TripCard from '../features/trips/TripCard.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { pickNextTrip, todayIso } from '../lib/trips.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadTrips() {
      try {
        const result = await fetchTrips();
        if (isCurrent) setTrips(result);
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

    loadTrips();
    return () => {
      isCurrent = false;
    };
  }, []);

  function handleCreatedTrip(trip) {
    setTrips((current) => [{ ...trip, memberCount: 1 }, ...current]);
  }

  const today = todayIso();
  const nextTrip = pickNextTrip(trips, today);
  const otherTrips = trips
    .filter((trip) => trip !== nextTrip)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const firstName = user.name.split(' ')[0];

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted">Hi {firstName}</p>
          <h1 className="text-3xl font-extrabold">Your trips</h1>
        </div>
        <Button onClick={() => setIsCreatingTrip(true)}>
          <span aria-hidden="true">+&nbsp;</span>New trip
        </Button>
      </div>

      {loadError && <FormError message={loadError} />}

      {isLoading ? (
        <LoadingState label="Loading trips…" />
      ) : trips.length > 0 ? (
        <>
          {nextTrip && (
            <section aria-labelledby="next-trip-heading" className="flex flex-col gap-3">
              <h2
                id="next-trip-heading"
                className="text-sm font-bold tracking-wide text-muted uppercase"
              >
                Next up
              </h2>
              <TripCard trip={nextTrip} featured today={today} />
            </section>
          )}
          {otherTrips.length > 0 && (
            <section aria-labelledby="other-trips-heading" className="flex flex-col gap-3">
              <h2
                id="other-trips-heading"
                className="text-sm font-bold tracking-wide text-muted uppercase"
              >
                {nextTrip ? 'Other trips' : 'Past trips'}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} today={today} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-8 text-center">
          <p className="font-semibold">No trips yet</p>
          <p className="text-muted">Trips you create or join will appear here.</p>
          <Button onClick={() => setIsCreatingTrip(true)}>Plan your first trip</Button>
        </div>
      )}

      {isCreatingTrip && (
        <Modal title="New trip" onClose={() => setIsCreatingTrip(false)}>
          <NewTripWizard onCreated={handleCreatedTrip} onClose={() => setIsCreatingTrip(false)} />
        </Modal>
      )}
    </section>
  );
}
