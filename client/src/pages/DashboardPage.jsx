import { useAuth } from '../hooks/useAuth.js';

// TODO(#4): replace the empty state with the trip grid and "New trip" form.
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <section>
      <h1 className="text-2xl font-bold">Your trips</h1>
      <p className="mt-1 text-muted">Signed in as {user.email}</p>
      <div className="mt-6 rounded-card border border-border bg-card p-8 text-center">
        <p className="font-semibold">No trips yet</p>
        <p className="mt-1 text-muted">Trips you create or join will appear here.</p>
      </div>
    </section>
  );
}
