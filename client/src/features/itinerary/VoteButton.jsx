import { NO_VOTES, voteCountLabel } from '../../lib/votes.js';

export default function VoteButton({ activityTitle, votes = NO_VOTES, onToggle }) {
  const { count, voters, hasVoted } = votes;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-pressed={hasVoted}
        aria-label={`Vote for ${activityTitle}`}
        onClick={onToggle}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          hasVoted
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'border border-border bg-card text-ink hover:bg-page'
        }`}
      >
        <span aria-hidden="true">{hasVoted ? '✓' : '+'}</span>
        {hasVoted ? 'Voted' : 'Vote'}
      </button>
      <span className="text-sm font-semibold text-ink">{voteCountLabel(count)}</span>
      {voters.length > 0 && (
        <span className="text-sm text-muted">
          Voted by {voters.map((voter) => voter.name).join(', ')}
        </span>
      )}
    </div>
  );
}
