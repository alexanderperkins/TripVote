import { Link } from 'react-router';
import TripCover from '../../components/TripCover.jsx';
import { countdownLabel, formatShortDate, todayIso } from '../../lib/trips.js';

const ROLE_LABELS = { organizer: 'Organizer', member: 'Member', viewer: 'Viewer' };

function TripDates({ trip }) {
  return (
    <>
      <time dateTime={trip.startDate}>{formatShortDate(trip.startDate)}</time>
      {' – '}
      <time dateTime={trip.endDate}>{formatShortDate(trip.endDate)}</time>
    </>
  );
}

// A trip on the dashboard. "featured" is the big card for the next trip, with a countdown.
export default function TripCard({ trip, featured = false, today = todayIso() }) {
  const memberCount = trip.memberCount ?? 0;
  const roleLabel = ROLE_LABELS[trip.role] ?? trip.role;
  const members = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;
  const countdown = countdownLabel(trip, today);
  const linkClass =
    'group overflow-hidden rounded-card border border-border bg-card outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-primary';

  if (featured) {
    return (
      <Link
        to={`/trips/${trip.id}`}
        className={`${linkClass} grid shadow-sm md:grid-cols-[1.1fr_1fr]`}
      >
        <TripCover tripId={trip.id} className="flex min-h-48 flex-col p-5">
          <span className="w-max rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
            {roleLabel}
          </span>
          <p className="mt-10 text-4xl font-extrabold tabular-nums">{countdown}</p>
          <p className="mt-1 font-semibold">{trip.destination}</p>
        </TripCover>
        <div className="flex flex-col justify-center gap-3 p-5">
          <h2 className="text-2xl font-extrabold text-ink group-hover:text-primary">{trip.name}</h2>
          <p className="text-muted">
            <TripDates trip={trip} />
          </p>
          <p className="text-sm font-semibold text-ink">{members}</p>
          <span className="mt-2 text-sm font-bold text-primary">
            Open trip<span aria-hidden="true"> →</span>
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/trips/${trip.id}`} className={`${linkClass} flex flex-col`}>
      <TripCover tripId={trip.id} className="flex min-h-24 flex-col justify-between gap-4 p-4">
        <span className="w-max rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
          {roleLabel}
        </span>
        <p className="font-bold">{trip.destination}</p>
      </TripCover>
      <div className="flex flex-col gap-2 p-4">
        <h2 className="text-lg font-bold text-ink">{trip.name}</h2>
        <p className="text-sm text-muted">
          <TripDates trip={trip} />
        </p>
        <p className="flex justify-between gap-2 text-sm">
          <span className="text-muted">{members}</span>
          <span className="font-semibold text-ink">{countdown}</span>
        </p>
      </div>
    </Link>
  );
}
