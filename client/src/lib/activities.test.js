import { describe, it, expect } from 'vitest';
import { applyVotes, removeActivity, upsertActivity } from './activities.js';

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
