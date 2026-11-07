import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import DashboardPage from './DashboardPage.jsx';
import { AuthContext } from '../features/auth/authContext.js';

const USER = { id: 'user-1', name: 'Ana Lopez', email: 'ana@example.com' };
const TRIP = {
  id: 'trip-1',
  name: 'Lisbon',
  destination: 'Portugal',
  startDate: '2026-12-01',
  endDate: '2026-12-07',
  role: 'organizer',
  memberCount: 2,
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: USER }}>
        <DashboardPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

function stubFetch(trips) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(trips), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('DashboardPage', () => {
  it('shows trip cards returned by the trips API', async () => {
    const fetchMock = stubFetch([TRIP]);
    renderDashboard();

    const cardLink = await screen.findByRole('link', { name: /lisbon/i });
    expect(cardLink).toHaveAttribute('href', '/trips/trip-1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/trips',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('shows an empty state when the trips API returns no trips', async () => {
    const fetchMock = stubFetch([]);
    renderDashboard();

    expect(await screen.findByText('No trips yet')).toBeInTheDocument();
    expect(screen.getByText('Trips you create or join will appear here.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/trips',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });
});
