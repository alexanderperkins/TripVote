import { apiRequest } from './client.js';

export function fetchTrips() {
  return apiRequest('/api/trips');
}

export function createTrip(trip) {
  return apiRequest('/api/trips', { method: 'POST', body: trip });
}

export function fetchTrip(tripId) {
  return apiRequest(`/api/trips/${encodeURIComponent(tripId)}`);
}

export function updateTrip(tripId, trip) {
  return apiRequest(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: 'PATCH',
    body: trip,
  });
}

export function deleteTrip(tripId) {
  return apiRequest(`/api/trips/${encodeURIComponent(tripId)}`, { method: 'DELETE' });
}
