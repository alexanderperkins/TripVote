// Pushes itinerary changes to every Member who has the trip open.
// Does nothing when the live-update server is not running (for example in Supertest).

export const ACTIVITY_CREATED = 'activity:created';
export const ACTIVITY_UPDATED = 'activity:updated';
export const ACTIVITY_DELETED = 'activity:deleted';
export const ACTIVITY_VOTES = 'activity:votes';

function realtime(req) {
  return req.app.locals.realtime;
}

// hasVoted depends on who is looking, so each client works it out from voters.
function sharedVotes({ count, voters }) {
  return { count, voters };
}

function sharedActivity(activity) {
  return { ...activity, votes: sharedVotes(activity.votes) };
}

export function notifyActivityCreated(req, activity) {
  realtime(req)?.emitToTrip(req.params.tripId, ACTIVITY_CREATED, sharedActivity(activity));
}

export function notifyActivityUpdated(req, activity) {
  realtime(req)?.emitToTrip(req.params.tripId, ACTIVITY_UPDATED, sharedActivity(activity));
}

export function notifyActivityDeleted(req, activityId) {
  realtime(req)?.emitToTrip(req.params.tripId, ACTIVITY_DELETED, { id: activityId });
}

export function notifyVotesChanged(req, activity) {
  realtime(req)?.emitToTrip(req.params.tripId, ACTIVITY_VOTES, {
    id: activity.id,
    votes: sharedVotes(activity.votes),
  });
}

export async function notifyMemberRemoved(req, userId) {
  await realtime(req)?.removeUserFromTrip(req.params.tripId, userId);
}
