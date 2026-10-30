import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../../src/services/tokenService.js';

const SECRET = 'unit-test-secret-value-1234567890';

describe('tokenService', () => {
  it('round-trips the user id', () => {
    const token = signToken('user-123', { secret: SECRET, expiresIn: '1h' });

    expect(verifyToken(token, { secret: SECRET })).toBe('user-123');
  });

  it('returns null for a token signed with another secret', () => {
    const token = signToken('user-123', {
      secret: 'another-secret-value-0987654321',
      expiresIn: '1h',
    });

    expect(verifyToken(token, { secret: SECRET })).toBeNull();
  });

  it('returns null for an expired token', () => {
    const token = signToken('user-123', { secret: SECRET, expiresIn: -10 });

    expect(verifyToken(token, { secret: SECRET })).toBeNull();
  });

  it('returns null for garbage or a missing token', () => {
    expect(verifyToken('garbage', { secret: SECRET })).toBeNull();
    expect(verifyToken(undefined, { secret: SECRET })).toBeNull();
  });
});
