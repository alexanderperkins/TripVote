import { apiRequest } from './client.js';

const tripPath = (tripId) => `/api/trips/${encodeURIComponent(tripId)}`;

export function requestToJoin(shareCode) {
  return apiRequest(`/api/join/${encodeURIComponent(shareCode)}/requests`, { method: 'POST' });
}

export function approveJoinRequest(tripId, userId) {
  return apiRequest(`${tripPath(tripId)}/join-requests/${encodeURIComponent(userId)}/approve`, {
    method: 'POST',
  });
}

export function denyJoinRequest(tripId, userId) {
  return apiRequest(`${tripPath(tripId)}/join-requests/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export function removeMember(tripId, userId) {
  return apiRequest(`${tripPath(tripId)}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}
