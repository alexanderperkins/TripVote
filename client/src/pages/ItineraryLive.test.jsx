import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import ItineraryPage from './ItineraryPage.jsx';
import { AuthContext } from '../features/auth/authContext.js';
import { connectSocket, dropSocket, lastSocket } from '../test/fakeSocket.js';

const USER = { id: 'user-1', name: 'Ana Lopez', email: 'ana@example.com' };
const SAM = { userId: 'user-2', name: 'Sam Rivera' };
const ANA = { userId: 'user-1', name: 'Ana Lopez' };
const TRIP = {
  id: 'trip-1',
  name: 'Lisbon',
  destination: 'Portugal',
  startDate: '2026-12-01',
  endDate: '2026-12-07',
  role: 'member',
  members: [
    { userId: 'user-1', name: 'Ana Lopez', role: 'member' },
    { userId: 'user-2', name: 'Sam Rivera', role: 'organizer' },
  ],
};
const TRAM = {
  id: 'activity-1',
  title: 'Tram 28',
  date: '2026-12-01',
  time: '15:00',
  addedBy: SAM,
  votes: { count: 0, voters: [], hasVoted: false },
};
const MUSEUM = {
  id: 'activity-2',
  title: 'Museum',
  date: '2026-12-02',
  time: '10:00',
  addedBy: SAM,
  votes: { count: 0, voters: [] },
};

function renderItinerary({ activities = [TRAM] } = {}) {
  let itinerary = activities;
  const fetchMock = vi.fn((url) => {
    const data = String(url).endsWith('/itinerary') ? itinerary : TRIP;
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);

  const view = render(
    <MemoryRouter initialEntries={['/trips/trip-1/itinerary']}>
      <AuthContext.Provider value={{ user: USER }}>
        <Routes>
          <Route path="/trips/:tripId/itinerary" element={<ItineraryPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  return {
    unmount: view.unmount,
    fetchMock,
    setServerItinerary(next) {
      itinerary = next;
    },
  };
}

async function renderConnected(options) {
  const result = renderItinerary(options);
  await screen.findByRole('heading', { name: 'Tram 28' });
  act(() => connectSocket());
  return result;
}

function serverSends(event, payload) {
  act(() => lastSocket().serverEmit(event, payload));
}

function itineraryFetches(fetchMock) {
  return fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/itinerary')).length;
}

afterEach(() => vi.unstubAllGlobals());

describe('ItineraryPage live updates', () => {
  it('joins the trip’s live channel and shows Live', async () => {
    await renderConnected();

    expect(lastSocket().emitted[0].slice(0, 2)).toEqual(['trip:join', 'trip-1']);
    expect(screen.getByRole('status')).toHaveTextContent('Live');
  });

  it('shows a new activity from another Member without a reload', async () => {
    await renderConnected();

    serverSends('activity:created', MUSEUM);

    expect(screen.getByRole('heading', { name: 'Museum' })).toBeInTheDocument();
    expect(screen.getByText('2026-12-02')).toBeInTheDocument();
  });

  it('does not show the same activity twice', async () => {
    await renderConnected();

    serverSends('activity:created', { ...TRAM, votes: { count: 0, voters: [] } });

    expect(screen.getAllByRole('heading', { name: 'Tram 28' })).toHaveLength(1);
  });

  it('shows an edited activity from another Member', async () => {
    await renderConnected();

    serverSends('activity:updated', { ...TRAM, title: 'Tram 28 to Graça', time: '16:30' });

    expect(screen.getByRole('heading', { name: 'Tram 28 to Graça' })).toBeInTheDocument();
    expect(screen.getByText('16:30')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tram 28' })).not.toBeInTheDocument();
  });

  it('removes an activity another Member deleted', async () => {
    await renderConnected();

    serverSends('activity:deleted', { id: 'activity-1' });

    expect(screen.queryByRole('heading', { name: 'Tram 28' })).not.toBeInTheDocument();
    expect(screen.getByText('No activities yet')).toBeInTheDocument();
  });

  it('shows another Member’s vote', async () => {
    await renderConnected();

    serverSends('activity:votes', { id: 'activity-1', votes: { count: 1, voters: [SAM] } });

    const card = within(screen.getByRole('heading', { name: 'Tram 28' }).closest('article'));
    expect(card.getByText('1 vote')).toBeInTheDocument();
    expect(card.getByText('Voted by Sam Rivera')).toBeInTheDocument();
    expect(card.getByRole('button', { name: 'Vote for Tram 28' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('marks the vote button pressed when a vote update includes the current user', async () => {
    await renderConnected();

    serverSends('activity:votes', { id: 'activity-1', votes: { count: 2, voters: [SAM, ANA] } });

    expect(screen.getByRole('button', { name: 'Vote for Tram 28' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows a message and keeps the page working when the connection drops', async () => {
    await renderConnected();

    act(() => dropSocket());

    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting');
    expect(screen.getByRole('status')).toHaveTextContent(/live updates are paused/i);
    expect(screen.getByRole('heading', { name: 'Tram 28' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add activity' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Vote for Tram 28' })).toBeEnabled();
  });

  it('rejoins and catches up on missed changes after reconnecting', async () => {
    const { fetchMock, setServerItinerary } = await renderConnected();
    act(() => dropSocket());
    setServerItinerary([TRAM, MUSEUM]);
    const fetchesBefore = itineraryFetches(fetchMock);

    act(() => connectSocket());

    expect(await screen.findByRole('heading', { name: 'Museum' })).toBeInTheDocument();
    expect(itineraryFetches(fetchMock)).toBe(fetchesBefore + 1);
    const joins = lastSocket().emitted.filter(([event]) => event === 'trip:join');
    expect(joins).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('Live');
  });

  it('says live updates are unavailable when the server refuses to let the user join', async () => {
    renderItinerary();
    await screen.findByRole('heading', { name: 'Tram 28' });
    lastSocket().joinReply = { ok: false, error: 'FORBIDDEN' };

    act(() => connectSocket());

    expect(screen.getByRole('status')).toHaveTextContent(/live updates are unavailable/i);
  });

  it('closes the connection when leaving the page', async () => {
    const { unmount } = renderItinerary();
    await screen.findByRole('heading', { name: 'Tram 28' });
    const socket = lastSocket();

    unmount();

    expect(socket.disconnect).toHaveBeenCalled();
  });
});
