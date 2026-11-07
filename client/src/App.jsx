import { Routes, Route, Navigate } from 'react-router';
import AppBar from './components/AppBar.jsx';
import AuthProvider from './features/auth/AuthProvider.jsx';
import RequireAuth from './features/auth/RequireAuth.jsx';
import GuestOnly from './features/auth/GuestOnly.jsx';
import UserMenu from './features/auth/UserMenu.jsx';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <AppBar>
        <UserMenu />
      </AppBar>
      <main className="mx-auto max-w-[1120px] px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/trips" replace />} />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <AuthPage mode="login" />
              </GuestOnly>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestOnly>
                <AuthPage mode="signup" />
              </GuestOnly>
            }
          />
          <Route
            path="/trips"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/trips" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
