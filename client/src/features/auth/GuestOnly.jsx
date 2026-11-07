import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth.js';
import LoadingState from '../../components/LoadingState.jsx';

// Wraps the log in / sign up pages: once a user is logged in, send them on to the page
// they originally asked for, or to their trips.
export default function GuestOnly({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState />;
  if (user) {
    const from = location.state?.from;
    const destination = from ? `${from.pathname}${from.search ?? ''}` : '/trips';
    return <Navigate to={destination} replace />;
  }
  return children;
}
