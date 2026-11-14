import { describe, it, expect } from 'vitest';
import { summarizeAvailability, tripDates } from '../../src/services/availabilitySummary.js';

const ANA = { userId: 'u1', name: 'Ana' };
const SAM = { userId: 'u2', name: 'Sam' };
const KAI = { userId: 'u3', name: 'Kai' };
const TRIP = { startDate: '2026-12-30', endDate: '2027-01-02' };

describe('tripDates', () => {
  it('lists every date in the range, across a month and year change', () => {
    expect(tripDates('2026-12-30', '2027-01-02')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it('returns one date for a one-day trip', () => {
    expect(tripDates('2026-12-01', '2026-12-01')).toEqual(['2026-12-01']);
  });
});

describe('summarizeAvailability', () => {
  it('marks every date tied for the most free Members as best', () => {
    const summary = summarizeAvailability(
      TRIP,
      [ANA, SAM, KAI],
      [
        { ...ANA, dates: ['2026-12-31', '2027-01-02'] },
        { ...SAM, dates: ['2026-12-31', '2027-01-02'] },
        { ...KAI, dates: ['2026-12-30'] },
      ],
    );

    expect(summary.bestDates).toEqual(['2026-12-31', '2027-01-02']);
    expect(summary.days.map((day) => day.count)).toEqual([1, 2, 0, 2]);
  });

  it('has no best dates while nobody is free', () => {
    const summary = summarizeAvailability(TRIP, [ANA], [{ ...ANA, dates: [] }]);

    expect(summary.bestDates).toEqual([]);
  });

  it('keeps Members who have not responded in member order', () => {
    const summary = summarizeAvailability(TRIP, [ANA, SAM, KAI], [{ ...SAM, dates: [] }]);

    expect(summary.notResponded).toEqual([ANA, KAI]);
    expect(summary.memberCount).toBe(3);
  });

  it('drops responses from people who are not Members and dates outside the trip', () => {
    const summary = summarizeAvailability(
      TRIP,
      [ANA],
      [
        { ...ANA, dates: ['2026-12-29', '2026-12-30'] },
        { ...SAM, dates: ['2026-12-30'] },
      ],
    );

    expect(summary.responses).toEqual([{ ...ANA, dates: ['2026-12-30'] }]);
    expect(summary.days[0]).toEqual({ date: '2026-12-30', count: 1, members: [ANA] });
  });
});
