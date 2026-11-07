import { Link } from 'react-router';

export default function AppBar({ children }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-4 px-4">
        <Link
          to="/"
          className="rounded text-lg font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          TripVote
        </Link>
        {children}
      </div>
    </header>
  );
}
