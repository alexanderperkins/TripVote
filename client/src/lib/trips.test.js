import { describe, it, expect } from 'vitest';
import {
  countdownLabel,
  daysBetween,
  formatDateRange,
  initials,
  pickNextTrip,
  suggestTripName,
  toneFor,
  tripDays,
} from './trips.js';

const LISBON = { id: 't1', startDate: '2027-06-10', endDate: '2027-06-13' };
const KYOTO = { id: 't2', startDate: '2027-04-03', endDate: '2027-04-06' };
const PAST = { id: 't3', startDate: '2026-01-02', endDate: '2026-01-05' };

describe('tripDays', () => {
  it('lists every date from start to end, inclusive', () => {
    expect(tripDays('2027-06-10', '2027-06-13')).toEqual([
      '2027-06-10',
      '2027-06-11',
      '2027-06-12',
      '2027-06-13',
    ]);
  });

  it('crosses month ends', () => {
    expect(tripDays('2027-02-27', '2027-03-01')).toEqual([
      '2027-02-27',
      '2027-02-28',
      '2027-03-01',
    ]);
  });

  it('is empty when dates are missing or backwards', () => {
    expect(tripDays('', '2027-06-13')).toEqual([]);
    expect(tripDays('2027-06-13', '2027-06-10')).toEqual([]);
  });
});

describe('countdownLabel', () => {
  it('counts the days until the trip starts', () => {
    expect(daysBetween('2027-06-01', '2027-06-10')).toBe(9);
    expect(countdownLabel(LISBON, '2027-06-01')).toBe('9 days to go');
    expect(countdownLabel(LISBON, '2027-06-09')).toBe('Starts tomorrow');
  });

  it('says when the trip is on or over', () => {
    expect(countdownLabel(LISBON, '2027-06-11')).toBe('Happening now');
    expect(countdownLabel(LISBON, '2027-06-14')).toBe('Trip ended');
  });
});

describe('formatDateRange', () => {
  it('writes the year once when both dates share it', () => {
    expect(formatDateRange('2027-06-10', '2027-06-13')).toBe('Jun 10 – Jun 13, 2027');
  });

  it('writes both years when the trip crosses New Year', () => {
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('Dec 30, 2026 – Jan 2, 2027');
  });
});

describe('pickNextTrip', () => {
  it('features the soonest trip that has not ended', () => {
    expect(pickNextTrip([LISBON, PAST, KYOTO], '2026-11-13')).toBe(KYOTO);
  });

  it('keeps a trip that is happening now', () => {
    expect(pickNextTrip([LISBON, KYOTO], '2027-04-05')).toBe(KYOTO);
  });

  it('returns null when every trip has ended', () => {
    expect(pickNextTrip([PAST], '2026-11-13')).toBeNull();
  });
});

describe('suggestTripName', () => {
  it('names the trip after the first part of the destination', () => {
    expect(suggestTripName('Lisbon, Portugal')).toBe('Lisbon trip');
    expect(suggestTripName('  ')).toBe('');
  });
});

describe('initials and toneFor', () => {
  it('uses first and last initials', () => {
    expect(initials('Ana Lopez')).toBe('AL');
    expect(initials('casey')).toBe('CA');
    expect(initials('')).toBe('?');
  });

  it('gives the same id the same tone every time', () => {
    expect(toneFor('user-1')).toBe(toneFor('user-1'));
    expect(toneFor('user-1')).toBeGreaterThanOrEqual(0);
    expect(toneFor('user-1')).toBeLessThan(5);
  });
});
