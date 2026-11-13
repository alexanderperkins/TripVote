import { describe, it, expect } from 'vitest';
import {
  applyVotes,
  favoriteIds,
  groupByDay,
  newVoters,
  removeActivity,
  topActivities,
  upsertActivity,
} from './activities.js';

const ANA = { userId: 'user-1', name: 'Ana Lopez' };
const SAM = { userId: 'user-2', name: 'Sam Rivera' };
const TRAM = { id: 'a1', title: 'Tram 28', votes: { count: 0, voters: [], hasVoted: false } };
const DINNER = { id: 'a2', title: 'Dinner', votes: { count: 1, voters: [ANA], hasVoted: true } };

describe('upsertActivity', () => {
  it('adds a new activity and works out whether the current user voted', () => {
    const incoming = { id: 'a3', title: 'Museum', votes: { count: 1, voters: [ANA] } };

    expect(upsertActivity([TRAM], incoming, 'user-1')).toEqual([
      TRAM,
      { ...incoming, votes: { count: 1, voters: [ANA], hasVoted: true } },
    ]);
  });

  it('replaces an activity that is already in the list instead of adding it twice', () => {
    const edited = { id: 'a1', title: 'Tram 28 to Graça', votes: { count: 1, voters: [SAM] } };

    expect(upsertActivity([TRAM, DINNER], edited, 'user-1')).toEqual([
      { ...edited, votes: { count: 1, voters: [SAM], hasVoted: false } },
      DINNER,
    ]);
  });
});

describe('removeActivity', () => {
  it('removes the activity with the given id', () => {
    expect(removeActivity([TRAM, DINNER], 'a1')).toEqual([DINNER]);
  });

  it('leaves the list alone when the id is unknown', () => {
    expect(removeActivity([TRAM], 'missing')).toEqual([TRAM]);
  });
});

describe('applyVotes', () => {
  it('sets the vote count and voters and whether the current user voted', () => {
    expect(applyVotes([TRAM, DINNER], 'a1', { count: 2, voters: [SAM, ANA] }, 'user-1')).toEqual([
      { ...TRAM, votes: { count: 2, voters: [SAM, ANA], hasVoted: true } },
      DINNER,
    ]);
    expect(applyVotes([DINNER], 'a2', { count: 1, voters: [SAM] }, 'user-1')).toEqual([
      { ...DINNER, votes: { count: 1, voters: [SAM], hasVoted: false } },
    ]);
  });
});

describe('groupByDay', () => {
  const breakfast = { id: 'b', date: '2027-06-10', time: '08:30' };
  const dinner = { id: 'd', date: '2027-06-10', time: '19:00' };
  const outside = { id: 'o', date: '2027-06-20', time: '10:00' };

  it('keeps every trip day, including empty ones, with activities in time order', () => {
    expect(groupByDay([dinner, breakfast], ['2027-06-10', '2027-06-11'])).toEqual([
      { date: '2027-06-10', activities: [breakfast, dinner] },
      { date: '2027-06-11', activities: [] },
    ]);
  });

  it('keeps activities dated outside the trip range', () => {
    expect(groupByDay([outside], ['2027-06-10']).map((group) => group.date)).toEqual([
      '2027-06-10',
      '2027-06-20',
    ]);
  });
});

describe('favoriteIds and topActivities', () => {
  const votes = (count) => ({ count, voters: [], hasVoted: false });
  const a = { id: 'a', date: '2027-06-10', time: '09:00', votes: votes(3) };
  const b = { id: 'b', date: '2027-06-10', time: '12:00', votes: votes(1) };
  const c = { id: 'c', date: '2027-06-11', time: '09:00', votes: votes(1) };
  const d = { id: 'd', date: '2027-06-11', time: '10:00', votes: votes(0) };

  it('marks the most-voted activity of each day once it has two votes', () => {
    expect([...favoriteIds([a, b, c, d])]).toEqual(['a']);
  });

  it('lists the most-voted activities across the trip', () => {
    expect(topActivities([d, c, b, a], 2).map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('newVoters', () => {
  it('finds people who just voted, leaving out the viewer', () => {
    const before = { count: 1, voters: [ANA] };
    const after = { count: 2, voters: [ANA, SAM] };
    expect(newVoters(before, after, 'user-9')).toEqual([SAM]);
    expect(newVoters(before, after, 'user-2')).toEqual([]);
    expect(newVoters(after, before, 'user-9')).toEqual([]);
  });
});
