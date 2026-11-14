// Pure helpers that turn saved responses into what the Availability screen shows.

const DAY_MS = 24 * 60 * 60 * 1000;

// Every date from start to end, inclusive, as YYYY-MM-DD.
export function tripDates(startDate, endDate) {
  const dates = [];
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  for (let day = new Date(`${startDate}T00:00:00Z`).getTime(); day <= end; day += DAY_MS) {
    dates.push(new Date(day).toISOString().slice(0, 10));
  }
  return dates;
}

const person = ({ userId, name }) => ({ userId, name });

// members: active Members in display order. responses: { userId, name, dates }.
// Responses from non-Members and dates outside the trip are left out.
export function summarizeAvailability(trip, members, responses) {
  const dates = tripDates(trip.startDate, trip.endDate);
  const inTrip = new Set(dates);
  const memberIds = new Set(members.map((member) => member.userId));

  const kept = responses
    .filter((response) => memberIds.has(response.userId))
    .map((response) => ({
      ...person(response),
      dates: [...new Set(response.dates)].filter((date) => inTrip.has(date)).sort(),
    }));
  const respondedIds = new Set(kept.map((response) => response.userId));

  const days = dates.map((date) => {
    const free = members.filter((member) =>
      kept.some((response) => response.userId === member.userId && response.dates.includes(date)),
    );
    return { date, count: free.length, members: free.map(person) };
  });
  const most = Math.max(0, ...days.map((day) => day.count));

  return {
    days,
    bestDates: most > 0 ? days.filter((day) => day.count === most).map((day) => day.date) : [],
    responses: kept,
    notResponded: members.filter((member) => !respondedIds.has(member.userId)).map(person),
    memberCount: members.length,
  };
}
