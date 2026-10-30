import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiRequest, ApiError } from './client.js';

function mockFetch(status, body) {
  const response = new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
}

afterEach(() => vi.restoreAllMocks());

describe('apiRequest', () => {
  it('sends JSON with the session cookie and returns the parsed body', async () => {
    const fetchSpy = mockFetch(200, { id: 'u1' });

    const result = await apiRequest('/api/auth/login', { method: 'POST', body: { email: 'a' } });

    expect(result).toEqual({ id: 'u1' });
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":"a"}',
    });
  });

  it('returns null for an empty response', async () => {
    mockFetch(204);

    expect(await apiRequest('/api/auth/logout', { method: 'POST' })).toBeNull();
  });

  it('throws an ApiError with the server code, message and field errors', async () => {
    mockFetch(409, {
      error: { code: 'EMAIL_TAKEN', message: 'Taken.', fields: { email: 'Taken.' } },
    });

    const error = await apiRequest('/api/auth/register', { method: 'POST', body: {} }).catch(
      (err) => err,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
      message: 'Taken.',
      fields: { email: 'Taken.' },
    });
  });
});
