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
