import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth.js';
import LoadingState from '../../components/LoadingState.jsx';

// Wraps pages that need a logged-in user; remembers where to come back to after login.
export default function RequireAuth({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
