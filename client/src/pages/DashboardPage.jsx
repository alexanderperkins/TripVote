import { useEffect, useState } from 'react';
import { ApiError } from '../api/client.js';
import { fetchTrips } from '../api/trips.js';
import Button from '../components/Button.jsx';
import LoadingState from '../components/LoadingState.jsx';
import FormError from '../features/auth/FormError.jsx';
import NewTripForm from '../features/trips/NewTripForm.jsx';
import TripCard from '../features/trips/TripCard.jsx';
import { useAuth } from '../hooks/useAuth.js';

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

  async function handleCreatedTrip(trip) {
    setTrips((current) => [{ ...trip, memberCount: 1 }, ...current]);
    setIsCreatingTrip(false);
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your trips</h1>
          <p className="mt-1 text-muted">Signed in as {user.name}</p>
        </div>
        <Button onClick={() => setIsCreatingTrip((current) => !current)}>
          {isCreatingTrip ? 'Cancel' : 'New trip'}
        </Button>
      </div>

      {isCreatingTrip && (
        <div className="mt-6 rounded-card border border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-bold">Create a trip</h2>
          <NewTripForm onCreated={handleCreatedTrip} />
        </div>
      )}

      <div className="mt-6">
        {loadError && <FormError message={loadError} />}
        {isLoading ? (
          <LoadingState label="Loading trips…" />
        ) : trips.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-border bg-card p-8 text-center">
            <p className="font-semibold">No trips yet</p>
            <p className="mt-1 text-muted">Trips you create or join will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
