import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext.js';
import { registerUser, loginUser, logoutUser, fetchCurrentUser } from '../../api/auth.js';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    async function restoreSession() {
      let currentUser = null;
      try {
        currentUser = await fetchCurrentUser();
      } catch {
        // Server unreachable: treat as logged out; the login form will show any later error.
      }
      if (!isCurrent) return;
      setUser(currentUser);
      setIsLoading(false);
    }
    restoreSession();
    return () => {
      isCurrent = false;
    };
  }, []);

  const register = useCallback(async (details) => setUser(await registerUser(details)), []);
  const login = useCallback(async (credentials) => setUser(await loginUser(credentials)), []);
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, register, login, logout }),
    [user, isLoading, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
