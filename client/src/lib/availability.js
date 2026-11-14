// Pure helpers for the Availability screen. The server sends the same summary shape,
// so these keep the screen in step while a save is on its way.

const DAY_MS = 24 * 60 * 60 * 1000;
const HEAT_LEVELS = 4;

const person = ({ userId, name }) => ({ userId, name });

export function toggleDate(dates, date) {
  return dates.includes(date) ? dates.filter((d) => d !== date) : [...dates, date].sort();
}

// 0 = nobody free, 4 = everyone free, steps in between by share of Members.
export function heatLevel(count, memberCount) {
  if (!count || !memberCount) return 0;
  return Math.min(HEAT_LEVELS, Math.ceil((count / memberCount) * HEAT_LEVELS));
}

function nextDay(isoDate) {
  return new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + DAY_MS).toISOString().slice(0, 10);
}

// Groups sorted dates into runs of back-to-back days.
export function dateRanges(dates) {
  const ranges = [];
  for (const date of dates) {
    const last = ranges.at(-1);
    if (last && nextDay(last.end) === date) last.end = date;
    else ranges.push({ start: date, end: date });
  }
  return ranges;
}

// The summary as it will be once the viewer's new dates are saved.
export function withMyDates(summary, me, dates) {
  const mine = { ...person(me), dates };
  const hasResponded = summary.responses.some((r) => r.userId === me.userId);
  const responses = hasResponded
    ? summary.responses.map((r) => (r.userId === me.userId ? mine : r))
    : [...summary.responses, mine];

  const days = summary.days.map((day) => {
    const others = day.members.filter((m) => m.userId !== me.userId);
    const members = dates.includes(day.date) ? [...others, person(me)] : others;
    return { ...day, count: members.length, members };
  });
  const most = Math.max(0, ...days.map((day) => day.count));

  return {
    ...summary,
    days,
    bestDates: most > 0 ? days.filter((day) => day.count === most).map((day) => day.date) : [],
    responses,
    notResponded: summary.notResponded.filter((p) => p.userId !== me.userId),
  };
}

// Other Members whose free days are different in next than in previous.
export function peopleWhoChanged(previous, next, viewerId) {
  const before = new Map(previous.responses.map((r) => [r.userId, r.dates.join()]));
  return next.responses
    .filter((r) => r.userId !== viewerId && before.get(r.userId) !== r.dates.join())
    .map(person);
}
