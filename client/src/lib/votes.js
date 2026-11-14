export const NO_VOTES = { count: 0, voters: [], hasVoted: false };

// The votes an activity shows right after the current user toggles their vote,
// before the server answers.
export function toggleVote(votes = NO_VOTES, user) {
  if (votes.hasVoted) {
    const voters = votes.voters.filter((voter) => voter.userId !== user.id);
    return { count: Math.max(votes.count - 1, 0), voters, hasVoted: false };
  }
  return {
    count: votes.count + 1,
    voters: [...votes.voters, { userId: user.id, name: user.name }],
    hasVoted: true,
  };
}

export function voteCountLabel(count) {
  if (count === 0) return 'No votes yet';
  return count === 1 ? '1 vote' : `${count} votes`;
}
