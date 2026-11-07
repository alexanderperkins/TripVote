import { useId } from 'react';

export default function TextField({ label, error, ...inputProps }) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-11 rounded-lg border bg-card px-3 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          error ? 'border-danger' : 'border-border'
        }`}
        {...inputProps}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
