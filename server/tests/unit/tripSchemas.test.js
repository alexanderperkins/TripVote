import { describe, it, expect } from 'vitest';
import { tripSchema } from '../../src/validators/tripSchemas.js';

const VALID_TRIP = {
  name: 'Lisbon',
  destination: 'Portugal',
  startDate: '2026-12-01',
  endDate: '2026-12-07',
};

describe('tripSchema', () => {
  it('accepts valid trip input', () => {
    expect(tripSchema.safeParse(VALID_TRIP).success).toBe(true);
  });

  it('rejects an end date before the start date', () => {
    const result = tripSchema.safeParse({ ...VALID_TRIP, endDate: '2026-11-30' });

    expect(result.success).toBe(false);
  });

  it('accepts equal start and end dates', () => {
    const result = tripSchema.safeParse({ ...VALID_TRIP, endDate: '2026-12-01' });

    expect(result.success).toBe(true);
  });

  it.each(['name', 'destination'])('rejects a missing %s', (field) => {
    const result = tripSchema.safeParse({ ...VALID_TRIP, [field]: '' });

    expect(result.success).toBe(false);
  });
});
