import { apiRequest } from './client.js';

export function fetchActivities(tripId) {
  return apiRequest(`/api/trips/${encodeURIComponent(tripId)}/itinerary`);
}

export function createActivity(tripId, activity) {
  return apiRequest(`/api/trips/${encodeURIComponent(tripId)}/itinerary`, {
    method: 'POST',
    body: activity,
  });
}

export function updateActivity(tripId, activityId, activity) {
  return apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/itinerary/${encodeURIComponent(activityId)}`,
    {
      method: 'PATCH',
      body: activity,
    },
  );
}

export function deleteActivity(tripId, activityId) {
  return apiRequest(
    `/api/trips/${encodeURIComponent(tripId)}/itinerary/${encodeURIComponent(activityId)}`,
    {
      method: 'DELETE',
    },
  );
}

function votesPath(tripId, activityId) {
  return `/api/trips/${encodeURIComponent(tripId)}/itinerary/${encodeURIComponent(activityId)}/votes`;
}

export function addVote(tripId, activityId) {
  return apiRequest(votesPath(tripId, activityId), { method: 'POST' });
}

export function removeVote(tripId, activityId) {
  return apiRequest(votesPath(tripId, activityId), { method: 'DELETE' });
}
