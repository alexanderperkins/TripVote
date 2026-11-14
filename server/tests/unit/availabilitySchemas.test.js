import { describe, it, expect } from 'vitest';
import { availabilitySchema } from '../../src/validators/availabilitySchemas.js';

describe('availabilitySchema', () => {
  it('accepts a list of dates', () => {
    expect(availabilitySchema.safeParse({ dates: ['2026-12-01'] }).success).toBe(true);
  });

  it('accepts an empty list', () => {
    expect(availabilitySchema.safeParse({ dates: [] }).success).toBe(true);
  });

  it.each([{}, { dates: ['2026-13-01'] }, { dates: '2026-12-01' }])('rejects %j', (body) => {
    expect(availabilitySchema.safeParse(body).success).toBe(false);
  });

  it('rejects an unreasonably long list', () => {
    const dates = Array.from({ length: 400 }, () => '2026-12-01');

    expect(availabilitySchema.safeParse({ dates }).success).toBe(false);
  });
});
