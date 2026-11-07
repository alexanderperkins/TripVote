import { Link } from 'react-router';

function formatTripDate(date) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export default function TripCard({ trip }) {
  const memberCount = trip.memberCount ?? 0;

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="block rounded-card border border-border bg-card p-5 outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{trip.name}</h2>
          <p className="mt-1 text-muted">{trip.destination}</p>
        </div>
        <span className="rounded-full bg-page px-3 py-1 text-sm font-semibold capitalize text-ink">
          {trip.role.charAt(0).toUpperCase() + trip.role.slice(1)}
        </span>
      </div>
      <p className="mt-4 text-sm text-muted">
        <time dateTime={trip.startDate}>{formatTripDate(trip.startDate)}</time>
        {' – '}
        <time dateTime={trip.endDate}>{formatTripDate(trip.endDate)}</time>
      </p>
      <p className="mt-3 text-sm text-muted">
        {memberCount} {memberCount === 1 ? 'member' : 'members'}
      </p>
    </Link>
  );
}
