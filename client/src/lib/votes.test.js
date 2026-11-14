import { describe, it, expect } from 'vitest';
import { NO_VOTES, toggleVote, voteCountLabel } from './votes.js';

const ANA = { id: 'user-1', name: 'Ana Lopez' };
const SAM = { userId: 'user-2', name: 'Sam Rivera' };

describe('toggleVote', () => {
  it('adds the user as the last voter when they have not voted', () => {
    expect(toggleVote({ count: 1, voters: [SAM], hasVoted: false }, ANA)).toEqual({
      count: 2,
      voters: [SAM, { userId: 'user-1', name: 'Ana Lopez' }],
      hasVoted: true,
    });
  });

  it('removes the user when they have already voted', () => {
    const votes = {
      count: 2,
      voters: [SAM, { userId: 'user-1', name: 'Ana Lopez' }],
      hasVoted: true,
    };
    expect(toggleVote(votes, ANA)).toEqual({ count: 1, voters: [SAM], hasVoted: false });
  });

  it('treats missing votes as no votes', () => {
    expect(toggleVote(undefined, ANA)).toEqual({
      count: 1,
      voters: [{ userId: 'user-1', name: 'Ana Lopez' }],
      hasVoted: true,
    });
    expect(NO_VOTES).toEqual({ count: 0, voters: [], hasVoted: false });
  });
});

describe('voteCountLabel', () => {
  it.each([
    [0, 'No votes yet'],
    [1, '1 vote'],
    [3, '3 votes'],
  ])('labels %i as "%s"', (count, label) => {
    expect(voteCountLabel(count)).toBe(label);
  });
});
