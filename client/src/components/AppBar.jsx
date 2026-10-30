import { Link } from 'react-router';

export default function AppBar({ children }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4">
        <Link to="/" className="text-lg font-bold text-ink">
          TripVote
        </Link>
        {children}
      </div>
    </header>
  );
}
