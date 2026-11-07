export default function LoadingState({ label = 'Loading…' }) {
  return (
    <p role="status" className="py-12 text-center text-muted">
      {label}
    </p>
  );
}
