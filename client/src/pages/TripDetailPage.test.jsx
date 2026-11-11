import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import TripDetailPage from './TripDetailPage.jsx';
import { AuthContext } from '../features/auth/authContext.js';

const USER = { id: 'user-1', name: 'Ana Lopez', email: 'ana@example.com' };
const TRIP = {
  id: 'trip-1',
  name: 'Lisbon',
  destination: 'Portugal',
  startDate: '2026-12-01',
  endDate: '2026-12-07',
  shareCode: 'a1b2c3d4e5f678901234567890abcdef',
  role: 'member',
  members: [
    { userId: 'user-1', name: 'Ana Lopez', role: 'organizer' },
    { userId: 'user-2', name: 'Sam Rivera', role: 'member' },
  ],
};

function renderTripDetail(role) {
  const trip = { ...TRIP, role };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(trip), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );

  return render(
    <MemoryRouter initialEntries={['/trips/trip-1']}>
      <AuthContext.Provider value={{ user: USER }}>
        <Routes>
          <Route path="/trips/:tripId" element={<TripDetailPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('TripDetailPage', () => {
  it('copies the share link to the clipboard', async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    try {
      renderTripDetail('member');
      await user.click(await screen.findByRole('button', { name: /copy link/i }));

      expect(clipboardWrite).toHaveBeenCalledWith(
        `${window.location.origin}/join/${TRIP.shareCode}`,
      );
    } finally {
      clipboardWrite.mockRestore();
    }
  });

  it('shows the trip members', async () => {
    renderTripDetail('member');

    expect(await screen.findByText('Sam Rivera')).toBeInTheDocument();
    expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
  });

  it('shows Edit and Delete only for the Organizer', async () => {
    const { unmount } = renderTripDetail('organizer');

    expect(await screen.findByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();

    unmount();
    vi.unstubAllGlobals();
    renderTripDetail('member');

    expect(await screen.findByText('Sam Rivera')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});

function jsonResponse(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Answers GET /api/trips/trip-1 with the trip, and each other call with the next queued response.
function renderWithApi(trip, responses = []) {
  const queue = [...responses];
  const fetchMock = vi.fn(async (path, options) => {
    if (path === '/api/trips/trip-1' && options.method === 'GET') return jsonResponse(200, trip);
    return queue.shift() ?? jsonResponse(500, {});
  });
  vi.stubGlobal('fetch', fetchMock);

  render(
    <MemoryRouter initialEntries={['/trips/trip-1']}>
      <AuthContext.Provider value={{ user: trip.role === 'organizer' ? USER : MEMBER_USER }}>
        <Routes>
          <Route path="/trips/:tripId" element={<TripDetailPage />} />
          <Route path="/trips" element={<h1>Your trips</h1>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  return fetchMock;
}

const MEMBER_USER = { id: 'user-2', name: 'Sam Rivera', email: 'sam@example.com' };
const ORGANIZER_TRIP = {
  ...TRIP,
  role: 'organizer',
  joinRequests: [{ userId: 'user-3', name: 'Casey Kim', requestedAt: '2026-11-01T10:00:00.000Z' }],
};

describe('TripDetailPage join requests and members', () => {
  it('shows pending join requests with Approve and Deny to the Organizer', async () => {
    renderWithApi(ORGANIZER_TRIP);

    const requests = await screen.findByRole('region', { name: 'Join requests' });
    expect(within(requests).getByText('Casey Kim')).toBeInTheDocument();
    expect(within(requests).getByRole('button', { name: 'Approve Casey Kim' })).toBeInTheDocument();
    expect(within(requests).getByRole('button', { name: 'Deny Casey Kim' })).toBeInTheDocument();
  });

  it('says when there are no join requests', async () => {
    renderWithApi({ ...ORGANIZER_TRIP, joinRequests: [] });

    const requests = await screen.findByRole('region', { name: 'Join requests' });
    expect(within(requests).getByText(/no pending requests/i)).toBeInTheDocument();
  });

  it('moves an approved requester into the member list', async () => {
    const user = userEvent.setup();
    const fetchMock = renderWithApi(ORGANIZER_TRIP, [
      jsonResponse(200, { userId: 'user-3', name: 'Casey Kim', role: 'member' }),
    ]);

    await user.click(await screen.findByRole('button', { name: 'Approve Casey Kim' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/trips/trip-1/join-requests/user-3/approve',
      expect.objectContaining({ method: 'POST' }),
    );
    const members = screen.getByRole('region', { name: 'Members' });
    expect(await within(members).findByText('Casey Kim')).toBeInTheDocument();
    const requests = screen.getByRole('region', { name: 'Join requests' });
    expect(within(requests).queryByText('Casey Kim')).not.toBeInTheDocument();
  });

  it('removes a denied request from the list', async () => {
    const user = userEvent.setup();
    const fetchMock = renderWithApi(ORGANIZER_TRIP, [jsonResponse(204)]);

    await user.click(await screen.findByRole('button', { name: 'Deny Casey Kim' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/trips/trip-1/join-requests/user-3',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(await screen.findByText(/no pending requests/i)).toBeInTheDocument();
    expect(screen.queryByText('Casey Kim')).not.toBeInTheDocument();
  });

  it('lets the Organizer remove a Member but not themselves', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = renderWithApi(ORGANIZER_TRIP, [jsonResponse(204)]);

    const members = await screen.findByRole('region', { name: 'Members' });
    expect(within(members).queryByRole('button', { name: 'Remove Ana Lopez' })).toBeNull();
    await user.click(within(members).getByRole('button', { name: 'Remove Sam Rivera' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/trips/trip-1/members/user-2',
      expect.objectContaining({ method: 'DELETE' }),
    );
    await waitFor(() => expect(within(members).queryByText('Sam Rivera')).not.toBeInTheDocument());
    window.confirm.mockRestore();
  });

  it('shows a Member Leave trip instead of join requests or Remove buttons', async () => {
    renderWithApi({ ...TRIP, role: 'member' });

    expect(await screen.findByRole('button', { name: 'Leave trip' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Join requests' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^remove/i })).not.toBeInTheDocument();
  });

  it('takes a Member who leaves back to their trips', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = renderWithApi({ ...TRIP, role: 'member' }, [jsonResponse(204)]);

    await user.click(await screen.findByRole('button', { name: 'Leave trip' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/trips/trip-1/members/user-2',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(await screen.findByRole('heading', { name: 'Your trips' })).toBeInTheDocument();
    window.confirm.mockRestore();
  });
});
