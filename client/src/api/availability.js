import { apiRequest } from './client.js';

function availabilityPath(tripId) {
  return `/api/trips/${encodeURIComponent(tripId)}/availability`;
}

export function fetchAvailability(tripId) {
  return apiRequest(availabilityPath(tripId));
}

// Replaces the signed-in Member's free dates and returns the updated summary.
export function saveMyAvailability(tripId, dates) {
  return apiRequest(`${availabilityPath(tripId)}/me`, { method: 'PUT', body: { dates } });
}
