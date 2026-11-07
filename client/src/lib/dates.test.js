import { describe, it, expect } from 'vitest';
import { isEndBeforeStart } from './dates.js';

describe('isEndBeforeStart', () => {
  it('returns true when the end date is before the start date', () => {
    expect(isEndBeforeStart('2026-12-02', '2026-12-01')).toBe(true);
  });

  it('returns false when the dates are equal', () => {
    expect(isEndBeforeStart('2026-12-01', '2026-12-01')).toBe(false);
  });

  it('returns false when the end date is after the start date', () => {
    expect(isEndBeforeStart('2026-12-01', '2026-12-02')).toBe(false);
  });
});
