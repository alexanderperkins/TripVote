import { initials, toneFor } from '../lib/trips.js';

const TONES = ['bg-avatar-0', 'bg-avatar-1', 'bg-avatar-2', 'bg-avatar-3', 'bg-avatar-4'];
const SIZES = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
};

// A colored circle with a person's initials. The name is the accessible label.
export function Avatar({ userId, name, size = 'md', className = '' }) {
  return (
    <span
      title={name}
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center rounded-full border-2 border-card font-bold text-white ${SIZES[size]} ${TONES[toneFor(userId ?? name)]} ${className}`}
    >
      {size === 'sm' ? initials(name)[0] : initials(name)}
    </span>
  );
}

// Overlapping avatars for a group. Screen readers get the names as text instead.
export function AvatarStack({ people, size = 'md', max = 5, label }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="inline-flex items-center">
      <span className="inline-flex -space-x-1.5">
        {shown.map((person) => (
          <Avatar key={person.userId} userId={person.userId} name={person.name} size={size} />
        ))}
        {extra > 0 && (
          <span
            aria-hidden="true"
            className={`inline-grid place-items-center rounded-full border-2 border-card bg-muted font-bold text-white ${SIZES[size]}`}
          >
            +{extra}
          </span>
        )}
      </span>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
