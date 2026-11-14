import { heatLevel } from '../../lib/availability.js';
import { formatDayLabel } from '../../lib/trips.js';

// Darker = more Members free. Levels 0-3 keep ink text; level 4 is solid primary with white text.
const HEAT = [
  'bg-card text-ink',
  'bg-primary/10 text-ink',
  'bg-primary/25 text-ink',
  'bg-primary/45 text-ink',
  'bg-primary text-white',
];

const weekday = (isoDate) =>
  new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );

function dayLabel(day, { isMine, isBest, memberCount }) {
  const names = day.members.map((member) => member.name).join(', ');
  return [
    `${formatDayLabel(day.date)}.`,
    isMine ? "You're free." : 'Not marked.',
    `${day.count} of ${memberCount} free${names ? `: ${names}` : ''}.`,
    isBest ? 'Best day.' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function HeatLegend() {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-muted">
      <span>Fewer free</span>
      <span aria-hidden="true" className="flex gap-1">
        {HEAT.map((tone) => (
          <span key={tone} className={`h-3 w-5 rounded border border-border ${tone}`} />
        ))}
      </span>
      <span>More free</span>
    </div>
  );
}

// One button per trip day. Tapping toggles the viewer's own availability for that day.
export default function DayGrid({ days, myDates, bestDates, memberCount, onToggle }) {
  const best = new Set(bestDates);

  return (
    <div
      role="group"
      aria-label="Trip days"
      className="grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-2"
    >
      {days.map((day) => {
        const isMine = myDates.includes(day.date);
        const isBest = best.has(day.date);
        const level = heatLevel(day.count, memberCount);
        return (
          <button
            key={day.date}
            type="button"
            aria-pressed={isMine}
            aria-label={dayLabel(day, { isMine, isBest, memberCount })}
            onClick={() => onToggle(day.date)}
            className={`relative flex min-h-24 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 pt-4 pb-2 outline-none transition focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${HEAT[level]} ${
              isMine ? 'border-2 border-ink' : 'border-border hover:border-primary'
            }`}
          >
            {isBest && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-warning-text px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white">
                BEST
              </span>
            )}
            {isMine && (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-white"
              >
                ✓
              </span>
            )}
            <span className="text-xs font-semibold">{weekday(day.date)}</span>
            <span className="text-xl leading-none font-extrabold">
              {Number(day.date.slice(8, 10))}
            </span>
            <span className="text-xs font-bold">
              {day.count}/{memberCount}
            </span>
          </button>
        );
      })}
    </div>
  );
}
