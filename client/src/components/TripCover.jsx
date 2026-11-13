import { toneFor } from '../lib/trips.js';

// Gradient directions and route shapes; each trip gets one by its id so it always looks the same.
const GRADIENTS = [
  'bg-linear-to-br from-ink to-primary',
  'bg-linear-to-tr from-ink to-primary',
  'bg-linear-to-r from-ink via-ink to-primary',
  'bg-linear-to-bl from-ink to-primary',
  'bg-linear-to-b from-ink to-primary',
];
const ROUTES = [
  'M10 85 C 90 20, 160 95, 290 30',
  'M10 70 C 80 95, 170 10, 290 45',
  'M10 90 C 120 60, 150 20, 290 25',
  'M10 60 C 70 10, 200 100, 290 35',
  'M10 80 C 110 90, 180 40, 290 20',
];

// The decorative banner behind a trip's name: a gradient with a dotted route to the destination.
export default function TripCover({ tripId, className = '', children }) {
  const tone = toneFor(tripId);
  const end = ROUTES[tone].split(' ').slice(-2);
  return (
    <div className={`relative overflow-hidden text-white ${GRADIENTS[tone]} ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 300 110"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M0 80 L40 60 L80 75 L130 45 L180 70 L230 50 L300 65 L300 110 L0 110 Z"
          fill="white"
          fillOpacity="0.05"
        />
        <path
          d="M0 95 L50 80 L110 92 L170 75 L240 90 L300 80 L300 110 L0 110 Z"
          fill="white"
          fillOpacity="0.07"
        />
        <path
          d={ROUTES[tone]}
          fill="none"
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeDasharray="2 5"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={end[0]} cy={end[1]} r="3.5" className="fill-warning" />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
