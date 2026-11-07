import { apiRequest, ApiError } from './client.js';

export function registerUser({ name, email, password }) {
  return apiRequest('/api/auth/register', { method: 'POST', body: { name, email, password } });
}

export function loginUser({ email, password }) {
  return apiRequest('/api/auth/login', { method: 'POST', body: { email, password } });
}

export async function logoutUser() {
  await apiRequest('/api/auth/logout', { method: 'POST' });
}

// Returns the logged-in user, or null when there is no session.
export async function fetchCurrentUser() {
  try {
    return await apiRequest('/api/auth/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}
