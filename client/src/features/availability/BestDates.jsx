import { AvatarStack } from '../../components/Avatar.jsx';
import { dateRanges } from '../../lib/availability.js';
import { formatMonthDay } from '../../lib/trips.js';

function rangeLabel({ start, end }) {
  return start === end
    ? formatMonthDay(start)
    : `${formatMonthDay(start)} – ${formatMonthDay(end)}`;
}

// The days with the most overlap, and who is free on them.
export default function BestDates({ summary }) {
  const { bestDates, days, memberCount } = summary;
  const bestDay = days.find((day) => day.date === bestDates[0]);

  return (
    <section
      aria-label="Best dates"
      className="flex flex-col gap-2 rounded-card border border-border bg-card p-5"
    >
      <h2 className="text-lg font-bold">Best dates</h2>
      {bestDay ? (
        <>
          <p className="text-2xl font-extrabold text-ink">
            {dateRanges(bestDates).map(rangeLabel).join(', ')}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
            <AvatarStack people={bestDay.members} size="sm" />
            <span>
              {bestDay.count} of {memberCount} free ·{' '}
              {bestDay.members.map((member) => member.name).join(', ')}
            </span>
          </div>
        </>
      ) : (
        <p className="text-muted">No overlap yet. Tap the days you&apos;re free to get started.</p>
      )}
    </section>
  );
}
