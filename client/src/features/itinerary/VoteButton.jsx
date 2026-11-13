import { AvatarStack } from '../../components/Avatar.jsx';
import { NO_VOTES, voteCountLabel } from '../../lib/votes.js';

// Vote toggle plus how much of the group wants to go: count, a bar against the
// member count, and the voters' avatars (their names are read out as text).
export default function VoteButton({ activityTitle, votes = NO_VOTES, memberCount, onToggle }) {
  const { count, voters, hasVoted } = votes;
  const share = memberCount > 0 ? Math.min(count / memberCount, 1) : 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-pressed={hasVoted}
        aria-label={`Vote for ${activityTitle}`}
        onClick={onToggle}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          hasVoted
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'border border-border bg-card text-ink hover:border-primary hover:text-primary'
        }`}
      >
        <span aria-hidden="true">{hasVoted ? '✓' : '+'}</span>
        {hasVoted ? 'Voted' : 'Vote'}
      </button>
      <div className="flex min-w-40 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 text-sm">
          {voters.length > 0 ? (
            <AvatarStack people={voters} size="sm" />
          ) : (
            <span aria-hidden="true" />
          )}
          <span>
            <span className="font-bold text-ink">{voteCountLabel(count)}</span>
            {memberCount > 0 && count > 0 && (
              <span className="text-muted"> out of {memberCount}</span>
            )}
          </span>
        </div>
        {memberCount > 0 && (
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-page">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${share * 100}%` }}
            />
          </div>
        )}
        {voters.length > 0 && (
          <span className="sr-only">Voted by {voters.map((voter) => voter.name).join(', ')}</span>
        )}
      </div>
    </div>
  );
}
