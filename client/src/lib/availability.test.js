import { describe, it, expect } from 'vitest';
import {
  dateRanges,
  heatLevel,
  peopleWhoChanged,
  toggleDate,
  withMyDates,
} from './availability.js';

const ANA = { userId: 'u1', name: 'Ana' };
const SAM = { userId: 'u2', name: 'Sam' };

const SUMMARY = {
  days: [
    { date: '2026-12-01', count: 1, members: [SAM] },
    { date: '2026-12-02', count: 0, members: [] },
    { date: '2026-12-03', count: 0, members: [] },
  ],
  bestDates: ['2026-12-01'],
  responses: [{ ...SAM, dates: ['2026-12-01'] }],
  notResponded: [ANA],
  memberCount: 2,
};

describe('toggleDate', () => {
  it('adds a date and keeps the list sorted', () => {
    expect(toggleDate(['2026-12-03'], '2026-12-01')).toEqual(['2026-12-01', '2026-12-03']);
  });

  it('removes a date that is already there', () => {
    expect(toggleDate(['2026-12-01', '2026-12-03'], '2026-12-01')).toEqual(['2026-12-03']);
  });
});

describe('heatLevel', () => {
  it('is 0 when nobody is free', () => {
    expect(heatLevel(0, 4)).toBe(0);
  });

  it('is 4 when everyone is free', () => {
    expect(heatLevel(3, 3)).toBe(4);
  });

  it('grows with the share of Members who are free', () => {
    expect(heatLevel(1, 4)).toBe(1);
    expect(heatLevel(2, 4)).toBe(2);
    expect(heatLevel(3, 4)).toBe(3);
  });

  it('is 0 for a trip with no Members', () => {
    expect(heatLevel(0, 0)).toBe(0);
  });
});

describe('dateRanges', () => {
  it('joins back-to-back dates into one range', () => {
    expect(dateRanges(['2026-12-01', '2026-12-02', '2026-12-04'])).toEqual([
      { start: '2026-12-01', end: '2026-12-02' },
      { start: '2026-12-04', end: '2026-12-04' },
    ]);
  });

  it('joins dates across a month change', () => {
    expect(dateRanges(['2026-11-30', '2026-12-01'])).toEqual([
      { start: '2026-11-30', end: '2026-12-01' },
    ]);
  });

  it('returns nothing for no dates', () => {
    expect(dateRanges([])).toEqual([]);
  });
});

describe('withMyDates', () => {
  it("adds the viewer's response and recounts each day", () => {
    const next = withMyDates(SUMMARY, ANA, ['2026-12-01', '2026-12-02']);

    expect(next.days.map((day) => day.count)).toEqual([2, 1, 0]);
    expect(next.days[0].members).toEqual([SAM, ANA]);
    expect(next.bestDates).toEqual(['2026-12-01']);
    expect(next.notResponded).toEqual([]);
    expect(next.responses).toContainEqual({ ...ANA, dates: ['2026-12-01', '2026-12-02'] });
  });

  it("replaces the viewer's earlier response", () => {
    const next = withMyDates(SUMMARY, SAM, ['2026-12-03']);

    expect(next.responses).toEqual([{ ...SAM, dates: ['2026-12-03'] }]);
    expect(next.bestDates).toEqual(['2026-12-03']);
  });

  it('has no best dates when nobody is free', () => {
    expect(withMyDates(SUMMARY, SAM, []).bestDates).toEqual([]);
  });
});

describe('peopleWhoChanged', () => {
  it('names other Members whose dates changed', () => {
    const next = { ...SUMMARY, responses: [...SUMMARY.responses, { ...ANA, dates: [] }] };

    expect(peopleWhoChanged(SUMMARY, next, 'u2')).toEqual([ANA]);
  });

  it('leaves out the viewer and people whose dates stayed the same', () => {
    const next = { ...SUMMARY, responses: [{ ...SAM, dates: ['2026-12-02'] }] };

    expect(peopleWhoChanged(SUMMARY, next, 'u2')).toEqual([]);
    expect(peopleWhoChanged(SUMMARY, SUMMARY, 'u1')).toEqual([]);
  });
});
