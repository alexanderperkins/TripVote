// Pure helpers that apply live itinerary events to the list the page shows.

function withViewerVote(votes, userId) {
  const { count = 0, voters = [] } = votes ?? {};
  return { count, voters, hasVoted: voters.some((voter) => voter.userId === userId) };
}

export function upsertActivity(activities, activity, userId) {
  const next = { ...activity, votes: withViewerVote(activity.votes, userId) };
  const exists = activities.some((a) => a.id === activity.id);
  return exists ? activities.map((a) => (a.id === activity.id ? next : a)) : [...activities, next];
}

export function removeActivity(activities, activityId) {
  return activities.filter((a) => a.id !== activityId);
}

export function applyVotes(activities, activityId, votes, userId) {
  return activities.map((a) =>
    a.id === activityId ? { ...a, votes: withViewerVote(votes, userId) } : a,
  );
}

// Activities grouped by date in time order. Every trip day appears, even with no activities,
// and dates outside the trip range are kept so nothing is hidden.
export function groupByDay(activities, days = []) {
  const groups = new Map(days.map((day) => [day, []]));
  for (const activity of activities) {
    if (!groups.has(activity.date)) groups.set(activity.date, []);
    groups.get(activity.date).push(activity);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      activities: [...items].sort((a, b) => a.time.localeCompare(b.time)),
    }));
}

// Ids of the most-voted activity (or tied activities) on each day, when it has at least minVotes.
export function favoriteIds(activities, minVotes = 2) {
  const best = new Map();
  for (const activity of activities) {
    const count = activity.votes?.count ?? 0;
    best.set(activity.date, Math.max(best.get(activity.date) ?? 0, count));
  }
  return new Set(
    activities
      .filter((a) => {
        const count = a.votes?.count ?? 0;
        return count >= minVotes && count === best.get(a.date);
      })
      .map((a) => a.id),
  );
}

// The activities with the most votes across the trip, most-voted first.
export function topActivities(activities, limit = 3) {
  return activities
    .filter((a) => (a.votes?.count ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.votes?.count ?? 0) - (a.votes?.count ?? 0) ||
        a.date.localeCompare(b.date) ||
        a.time.localeCompare(b.time),
    )
    .slice(0, limit);
}

// People who appear in nextVotes but not in previousVotes, leaving out the viewer.
export function newVoters(previousVotes, nextVotes, viewerId) {
  const before = new Set((previousVotes?.voters ?? []).map((voter) => voter.userId));
  return (nextVotes?.voters ?? []).filter(
    (voter) => !before.has(voter.userId) && voter.userId !== viewerId,
  );
}
