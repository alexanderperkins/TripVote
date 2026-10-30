export default function FormError({ message }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
    >
      {message}
    </p>
  );
}
