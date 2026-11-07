const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary/90',
  secondary: 'border border-border bg-card text-ink hover:bg-page',
};

export default function Button({ variant = 'primary', className = '', ...buttonProps }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...buttonProps}
    />
  );
}
