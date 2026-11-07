import { NavLink, useLocation } from 'react-router';
import LoginForm from '../features/auth/LoginForm.jsx';
import SignupForm from '../features/auth/SignupForm.jsx';

const TABS = [
  { to: '/login', label: 'Log in' },
  { to: '/signup', label: 'Sign up' },
];

function tabClassName({ isActive }) {
  const base =
    'flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary';
  return isActive ? `${base} bg-card text-ink shadow-sm` : `${base} text-muted hover:text-ink`;
}

export default function AuthPage({ mode }) {
  // Keep "where to go after login" when switching tabs.
  const { state } = useLocation();
  const isSignup = mode === 'signup';

  return (
    <section className="mx-auto w-full max-w-md rounded-card border border-border bg-card p-6 sm:p-8">
      <h1 className="text-2xl font-bold">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
      <p className="mt-1 text-muted">
        {isSignup
          ? 'Plan trips with friends: pick dates, vote on activities and track the budget.'
          : 'Log in to see your trips.'}
      </p>
      <nav aria-label="Log in or sign up" className="mt-6 flex gap-1 rounded-xl bg-page p-1">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} state={state} replace className={tabClassName}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6">{isSignup ? <SignupForm /> : <LoginForm />}</div>
    </section>
  );
}
