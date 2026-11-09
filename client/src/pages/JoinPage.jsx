import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ApiError } from '../api/client.js';
import { fetchJoinTrip } from '../api/trips.js';
import FormError from '../features/auth/FormError.jsx';
import LoadingState from '../components/LoadingState.jsx';

export default function JoinPage() {
  const { shareCode } = useParams();
  const [trip, setTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isCurrent = true;

    async function loadTrip() {
      try {
        const result = await fetchJoinTrip(shareCode);
        if (isCurrent) setTrip(result);
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
  }, [shareCode]);

  if (isLoading) return <LoadingState label="Loading invite…" />;
  if (loadError) return <FormError message={loadError} />;
  if (!trip) return null;

  return (
    <section>
      <h1 className="text-2xl font-bold">{trip.name}</h1>
      <p className="mt-1 text-muted">Organized by {trip.organizerName}</p>
      <p className="mt-2 text-sm text-muted">
        {trip.startDate} – {trip.endDate}
      </p>
      <p className="mt-5 rounded-lg border border-border bg-page p-4 text-sm text-muted">
        Members-only: trip planning details are available to trip members.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Members</h2>
        {trip.members.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-card border border-border bg-card px-4">
            {trip.members.map((member, index) => (
              <li
                key={`${member.role}-${member.name}-${index}`}
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
