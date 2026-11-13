import { Link, NavLink } from 'react-router';
import { countdownLabel, formatDateRange, todayIso } from '../lib/trips.js';
import { AvatarStack } from './Avatar.jsx';
import TripCover from './TripCover.jsx';

const ROLE_LABELS = { organizer: 'Organizer', member: 'Member', viewer: 'Viewer' };

function TabLink({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `inline-flex min-h-12 items-center gap-2 border-b-[3px] px-3 text-sm font-bold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isActive ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

// Shared top of every trip page: cover, name, dates, countdown, members, live status and tabs.
export default function TripHeader({ trip, status, today = todayIso() }) {
  const members = trip.members ?? [];
  const requestCount = trip.role === 'organizer' ? (trip.joinRequests?.length ?? 0) : 0;

  return (
    <header className="overflow-hidden rounded-card border border-border bg-card">
      <TripCover tripId={trip.id} className="px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/trips"
            className="inline-flex min-h-9 items-center rounded-lg bg-white/15 px-3 text-sm font-bold text-white outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white"
          >
            <span aria-hidden="true">←&nbsp;</span>All trips
          </Link>
          {status}
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold text-balance sm:text-3xl">{trip.name}</h1>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-white/90">
            <span>{trip.destination}</span>
            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            <span>{countdownLabel(trip, today)}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {members.length > 0 && (
              <AvatarStack
                people={members}
                label={`Members: ${members.map((member) => member.name).join(', ')}`}
              />
            )}
            <span className="text-sm font-semibold">
              {members.length} going ·{' '}
              <span className="rounded-full bg-white/20 px-2.5 py-0.5">
                {ROLE_LABELS[trip.role] ?? trip.role}
              </span>
            </span>
          </div>
        </div>
      </TripCover>
      <nav aria-label="Trip sections" className="flex gap-1 overflow-x-auto px-3">
        <TabLink to={`/trips/${trip.id}`} end>
          Overview
          {requestCount > 0 && (
            <span className="rounded-full bg-warning px-2 text-xs text-white">
              {requestCount}
              <span className="sr-only"> join requests</span>
            </span>
          )}
        </TabLink>
        <TabLink to={`/trips/${trip.id}/itinerary`}>Itinerary</TabLink>
      </nav>
    </header>
  );
}
