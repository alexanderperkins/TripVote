const STATES = {
  connecting: { label: 'Connecting…', dot: 'bg-muted' },
  live: { label: 'Live', dot: 'bg-success' },
  reconnecting: {
    label: 'Reconnecting…',
    dot: 'bg-warning',
    message:
      'Live updates are paused. You can keep planning; changes from others will show when you reconnect.',
  },
  unavailable: {
    label: 'Offline',
    dot: 'bg-danger',
    message: 'Live updates are unavailable. Reload the page to see changes from others.',
  },
};

// tone="cover" is for the dark trip banner at the top of trip pages.
export default function ConnectionStatus({ status, tone = 'page' }) {
  const state = STATES[status] ?? STATES.connecting;

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-end gap-1">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
          tone === 'cover' ? 'bg-white/15 text-white' : 'bg-page text-ink'
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${state.dot} ${status === 'live' ? 'animate-pulse' : ''}`}
        />
        {state.label}
      </span>
      {state.message && (
        <p
          className={`max-w-xs text-right text-sm ${tone === 'cover' ? 'text-white/90' : 'text-muted'}`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
