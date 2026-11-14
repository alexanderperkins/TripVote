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

export default function ConnectionStatus({ status }) {
  const state = STATES[status] ?? STATES.connecting;

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-end gap-1">
      <span className="inline-flex items-center gap-2 rounded-full bg-page px-3 py-1 text-sm font-semibold text-ink">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${state.dot}`} />
        {state.label}
      </span>
      {state.message && <p className="max-w-xs text-right text-sm text-muted">{state.message}</p>}
    </div>
  );
}
