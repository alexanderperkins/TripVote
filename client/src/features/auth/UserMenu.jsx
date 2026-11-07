import Button from '../../components/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export default function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm font-semibold sm:inline">{user.name}</span>
      <Button variant="secondary" onClick={logout}>
        Log out
      </Button>
    </div>
  );
}
