// Pure helpers for showing trips: dates, countdowns and which trip comes next.

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`);
}

// Today's date in the viewer's time zone, as YYYY-MM-DD.
export function todayIso(now = new Date()) {
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

// Every date from start to end, inclusive. Empty when either is missing or end is before start.
export function tripDays(startDate, endDate) {
  if (!startDate || !endDate || endDate < startDate) return [];
  const days = [];
  for (let day = toUtc(startDate); day <= toUtc(endDate); day = new Date(day.getTime() + DAY_MS)) {
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

export function daysBetween(fromDate, toDate) {
  return Math.round((toUtc(toDate) - toUtc(fromDate)) / DAY_MS);
}

export function countdownLabel(trip, today) {
  if (today > trip.endDate) return 'Trip ended';
  if (today >= trip.startDate) return 'Happening now';
  const days = daysBetween(today, trip.startDate);
  if (days === 1) return 'Starts tomorrow';
  return `${days} days to go`;
}

function format(isoDate, options) {
  return new Intl.DateTimeFormat('en', { timeZone: 'UTC', ...options }).format(toUtc(isoDate));
}

export function formatShortDate(isoDate) {
  return format(isoDate, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateRange(startDate, endDate) {
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const start = format(startDate, sameYear ? { month: 'short', day: 'numeric' } : undefined);
  return `${sameYear ? start : formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
}

export function formatDayLabel(isoDate) {
  return format(isoDate, { weekday: 'short', month: 'short', day: 'numeric' });
}

// The trip to feature on the dashboard: the one happening now, else the soonest upcoming one.
export function pickNextTrip(trips, today) {
  const upcoming = trips
    .filter((trip) => trip.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return upcoming[0] ?? null;
}

// The default name the new-trip flow suggests for a destination.
export function suggestTripName(destination) {
  const place = destination.split(',')[0].trim();
  return place ? `${place} trip` : '';
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// A stable number from 0 to count - 1 for an id, so a person or trip keeps the same color.
export function toneFor(id = '', count = 5) {
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % count;
}
