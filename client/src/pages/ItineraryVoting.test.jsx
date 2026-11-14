import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import ItineraryPage from './ItineraryPage.jsx';
import { AuthContext } from '../features/auth/authContext.js';

const USER = { id: 'user-1', name: 'Ana Lopez', email: 'ana@example.com' };
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
const SAM = { userId: 'user-2', name: 'Sam Rivera' };
const ANA = { userId: 'user-1', name: 'Ana Lopez' };

function activity(overrides) {
  return {
    date: '2026-12-01',
    time: '10:00',
    addedBy: SAM,
    votes: { count: 0, voters: [], hasVoted: false },
    ...overrides,
  };
}

const TRAM = activity({
  id: 'activity-1',
  title: 'Tram 28',
  votes: { count: 1, voters: [SAM], hasVoted: false },
});
const DINNER = activity({
  id: 'activity-2',
  title: 'Dinner',
  time: '19:00',
  votes: { count: 2, voters: [SAM, ANA], hasVoted: true },
});
const MUSEUM = activity({ id: 'activity-3', title: 'Museum', time: '15:00' });

function jsonResponse(data, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function renderItinerary({ onVote } = {}) {
  const fetchMock = vi.fn((url, options = {}) => {
    const path = String(url);
    if (path.endsWith('/votes')) return onVote(path, options.method);
    if (path.endsWith('/itinerary')) return jsonResponse([TRAM, DINNER, MUSEUM]);
    return jsonResponse(TRIP);
  });
  vi.stubGlobal('fetch', fetchMock);

  render(
    <MemoryRouter initialEntries={['/trips/trip-1/itinerary']}>
      <AuthContext.Provider value={{ user: USER }}>
        <Routes>
          <Route path="/trips/:tripId/itinerary" element={<ItineraryPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  return fetchMock;
}

async function card(title) {
  const heading = await screen.findByRole('heading', { name: title });
  return within(heading.closest('article'));
}

afterEach(() => vi.unstubAllGlobals());

describe('ItineraryPage voting', () => {
  it('shows each activity’s vote count and who voted', async () => {
    renderItinerary();

    const tram = await card('Tram 28');
    expect(tram.getByText('1 vote')).toBeInTheDocument();
    expect(tram.getByText('Voted by Sam Rivera')).toBeInTheDocument();

    const dinner = await card('Dinner');
    expect(dinner.getByText('2 votes')).toBeInTheDocument();
    expect(dinner.getByText('Voted by Sam Rivera, Ana Lopez')).toBeInTheDocument();

    const museum = await card('Museum');
    expect(museum.getByText('No votes yet')).toBeInTheDocument();
  });

  it('shows a pressed Vote button only on activities the Member voted for', async () => {
    renderItinerary();

    const dinner = await card('Dinner');
    expect(dinner.getByRole('button', { name: 'Vote for Dinner' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const tram = await card('Tram 28');
    expect(tram.getByRole('button', { name: 'Vote for Tram 28' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('adds the Member’s vote when they press Vote', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn(() =>
      jsonResponse({ ...TRAM, votes: { count: 2, voters: [SAM, ANA], hasVoted: true } }, 201),
    );
    renderItinerary({ onVote });

    const tram = await card('Tram 28');
    await user.click(tram.getByRole('button', { name: 'Vote for Tram 28' }));

    expect(onVote).toHaveBeenCalledWith('/api/trips/trip-1/itinerary/activity-1/votes', 'POST');
    expect(tram.getByRole('button', { name: 'Vote for Tram 28' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await tram.findByText('2 votes')).toBeInTheDocument();
    expect(tram.getByText('Voted by Sam Rivera, Ana Lopez')).toBeInTheDocument();
  });

  it('removes the Member’s vote when they press Vote again', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn(() =>
      jsonResponse({ ...DINNER, votes: { count: 1, voters: [SAM], hasVoted: false } }),
    );
    renderItinerary({ onVote });

    const dinner = await card('Dinner');
    await user.click(dinner.getByRole('button', { name: 'Vote for Dinner' }));

    expect(onVote).toHaveBeenCalledWith('/api/trips/trip-1/itinerary/activity-2/votes', 'DELETE');
    expect(dinner.getByRole('button', { name: 'Vote for Dinner' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(await dinner.findByText('1 vote')).toBeInTheDocument();
    expect(dinner.getByText('Voted by Sam Rivera')).toBeInTheDocument();
  });

  it('updates the vote right away before the server answers', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn(() => new Promise(() => {}));
    renderItinerary({ onVote });

    const museum = await card('Museum');
    await user.click(museum.getByRole('button', { name: 'Vote for Museum' }));

    expect(museum.getByRole('button', { name: 'Vote for Museum' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(museum.getByText('1 vote')).toBeInTheDocument();
    expect(museum.getByText('Voted by Ana Lopez')).toBeInTheDocument();
  });

  it('rolls the vote back and shows an error when saving fails', async () => {
    const user = userEvent.setup();
    const onVote = vi.fn(() =>
      jsonResponse({ error: { code: 'SERVER_ERROR', message: 'Could not save your vote.' } }, 500),
    );
    renderItinerary({ onVote });

    const tram = await card('Tram 28');
    await user.click(tram.getByRole('button', { name: 'Vote for Tram 28' }));

    expect(await screen.findByText('Could not save your vote.')).toBeInTheDocument();
    expect(tram.getByRole('button', { name: 'Vote for Tram 28' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(tram.getByText('1 vote')).toBeInTheDocument();
    expect(tram.getByText('Voted by Sam Rivera')).toBeInTheDocument();
  });
});
