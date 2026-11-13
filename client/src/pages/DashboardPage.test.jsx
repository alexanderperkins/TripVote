import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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

  it('features the next trip with a countdown and lists the rest below', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-13T12:00:00'));
    const later = {
      ...TRIP,
      id: 'trip-2',
      name: 'Kyoto',
      startDate: '2027-04-03',
      endDate: '2027-04-06',
    };
    stubFetch([later, TRIP]);
    renderDashboard();

    const nextUp = await screen.findByRole('region', { name: 'Next up' });
    const featured = within(nextUp).getByRole('link', { name: /lisbon/i });
    expect(featured).toHaveTextContent('18 days to go');
    const others = screen.getByRole('region', { name: 'Other trips' });
    expect(within(others).getByRole('link', { name: /kyoto/i })).toHaveTextContent(
      '141 days to go',
    );
  });

  it('opens the new trip flow in a dialog', async () => {
    const user = userEvent.setup();
    stubFetch([]);
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: 'New trip' }));

    const dialog = screen.getByRole('dialog', { name: 'New trip' });
    expect(within(dialog).getByLabelText('Destination')).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
