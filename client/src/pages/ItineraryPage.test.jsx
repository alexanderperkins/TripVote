import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import ItineraryPage from './ItineraryPage.jsx';
import ToastProvider from '../components/ToastProvider.jsx';
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
    { userId: 'user-1', name: 'Ana Lopez', role: 'organizer' },
    { userId: 'user-2', name: 'Sam Rivera', role: 'member' },
  ],
};
const ACTIVITIES = [
  {
    id: 'activity-2',
    title: 'Dinner',
    date: '2026-12-01',
    time: '19:00',
    location: 'Time Out Market',
    notes: 'Meet near the entrance.',
    addedBy: { userId: 'user-2', name: 'Sam Rivera' },
  },
  {
    id: 'activity-3',
    title: 'Museum',
    date: '2026-12-02',
    time: '10:00',
    location: 'MAAT',
    notes: 'Bring student IDs.',
    addedBy: { userId: 'user-1', name: 'Ana Lopez' },
  },
  {
    id: 'activity-1',
    title: 'Breakfast',
    date: '2026-12-01',
    time: '08:30',
    location: 'Cafe A Brasileira',
    notes: 'Outdoor seating.',
    addedBy: { userId: 'user-1', name: 'Ana Lopez' },
  },
];

const SAM = { userId: 'user-2', name: 'Sam Rivera' };
const ANA = { userId: 'user-1', name: 'Ana Lopez' };

function jsonResponse(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// GET calls return the trip or the activities; other calls are answered by `onWrite`.
function renderItinerary(role = 'member', { activities = ACTIVITIES, onWrite } = {}) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const path = String(url);
    if (!options.method || options.method === 'GET') {
      return jsonResponse(200, path.endsWith('/itinerary') ? activities : { ...TRIP, role });
    }
    return onWrite ? onWrite(path, options) : jsonResponse(500, {});
  });
  vi.stubGlobal('fetch', fetchMock);

  const view = render(
    <MemoryRouter initialEntries={['/trips/trip-1/itinerary']}>
      <AuthContext.Provider value={{ user: USER }}>
        <ToastProvider>
          <Routes>
            <Route path="/trips/:tripId/itinerary" element={<ItineraryPage />} />
          </Routes>
        </ToastProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return { ...view, fetchMock };
}

function writes(fetchMock) {
  return fetchMock.mock.calls.filter(
    ([, options = {}]) => options.method && options.method !== 'GET',
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ItineraryPage', () => {
  it('shows every trip day in order, with activities in time order', async () => {
    renderItinerary();

    expect(await screen.findByText('Breakfast')).toBeInTheDocument();
    const days = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(days).toEqual([
      'Day 1 · Tue, Dec 1',
      'Day 2 · Wed, Dec 2',
      'Day 3 · Thu, Dec 3',
      'Day 4 · Fri, Dec 4',
      'Day 5 · Sat, Dec 5',
      'Day 6 · Sun, Dec 6',
      'Day 7 · Mon, Dec 7',
    ]);
    expect(screen.getAllByText('Nothing planned yet.')).toHaveLength(5);

    const breakfast = screen.getByText('Breakfast');
    const dinner = screen.getByText('Dinner');
    const museum = screen.getByText('Museum');
    expect(
      breakfast.compareDocumentPosition(dinner) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(dinner.compareDocumentPosition(museum) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the trip header and a day bar with how much is planned', async () => {
    renderItinerary();

    expect(await screen.findByRole('heading', { level: 1, name: 'Lisbon' })).toBeInTheDocument();
    const dayBar = screen.getByRole('navigation', { name: 'Days' });
    expect(within(dayBar).getByRole('button', { name: /Day 1.*2 planned/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(dayBar).getByRole('button', { name: /Day 3.*Nothing yet/ })).toBeInTheDocument();
  });

  it('shows each activity time, location, notes, and who suggested it', async () => {
    renderItinerary();

    expect(await screen.findByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('08:30')).toBeInTheDocument();
    expect(screen.getByText('Cafe A Brasileira')).toBeInTheDocument();
    expect(screen.getByText('Outdoor seating.')).toBeInTheDocument();
    expect(screen.getAllByText('Suggested by Ana Lopez')).toHaveLength(2);
    expect(screen.getByText('19:00')).toBeInTheDocument();
    expect(screen.getByText('Time Out Market')).toBeInTheDocument();
    expect(screen.getByText('Meet near the entrance.')).toBeInTheDocument();
    expect(screen.getByText('Suggested by Sam Rivera')).toBeInTheDocument();
  });

  it('opens a labeled Add activity dialog with the selected day filled in', async () => {
    const user = userEvent.setup();
    renderItinerary();

    await screen.findByText('Breakfast');
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Day 2/ }));
    await user.click(screen.getByRole('button', { name: 'Add activity' }));

    const dialog = screen.getByRole('dialog', { name: 'Add activity' });
    expect(within(dialog).getByLabelText('Title')).toBeRequired();
    expect(within(dialog).getByLabelText('Title')).toHaveFocus();
    expect(within(dialog).getByLabelText('Date')).toBeRequired();
    expect(within(dialog).getByLabelText('Date')).toHaveValue('2026-12-02');
    expect(within(dialog).getByLabelText('Time')).toBeRequired();
    expect(within(dialog).getByLabelText('Location')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Notes')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('adds the new activity with the author’s vote already on it', async () => {
    const user = userEvent.setup();
    const created = {
      id: 'activity-9',
      title: 'Tram 28',
      date: '2026-12-01',
      time: '15:00',
      addedBy: ANA,
      votes: { count: 0, voters: [] },
    };
    const { fetchMock } = renderItinerary('member', {
      onWrite: (path) =>
        path.endsWith('/votes')
          ? jsonResponse(200, { ...created, votes: { count: 1, voters: [ANA] } })
          : jsonResponse(201, created),
    });

    await screen.findByText('Breakfast');
    await user.click(screen.getByRole('button', { name: 'Add activity' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), 'Tram 28');
    await user.type(within(dialog).getByLabelText('Time'), '15:00');
    await user.click(within(dialog).getByRole('button', { name: 'Add activity' }));

    const card = (await screen.findByRole('heading', { name: 'Tram 28' })).closest('article');
    await waitFor(() =>
      expect(within(card).getByRole('button', { name: 'Vote for Tram 28' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
    expect(within(card).getByText('1 vote')).toBeInTheDocument();
    expect(writes(fetchMock).map(([url, options]) => [url, options.method])).toEqual([
      ['/api/trips/trip-1/itinerary', 'POST'],
      ['/api/trips/trip-1/itinerary/activity-9/votes', 'POST'],
    ]);
  });

  it('puts Edit and Delete in a menu, only on the current Member’s activities', async () => {
    const user = userEvent.setup();
    renderItinerary();

    await screen.findByText('Breakfast');
    expect(screen.queryByRole('button', { name: /^edit/i })).not.toBeInTheDocument();
    const menus = screen.getAllByRole('button', { name: /more actions/i });
    expect(menus).toHaveLength(1);

    await user.click(menus[0]);
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('gives the Organizer the menu on every activity', async () => {
    renderItinerary('organizer');

    await screen.findByText('Breakfast');
    expect(screen.getAllByRole('button', { name: /more actions/i })).toHaveLength(
      ACTIVITIES.length,
    );
  });

  it('hides a deleted activity at once and lets the person undo it', async () => {
    const user = userEvent.setup();
    const { fetchMock } = renderItinerary('organizer');

    await screen.findByText('Breakfast');
    await user.click(screen.getByRole('button', { name: 'More actions for Dinner' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(screen.queryByRole('heading', { name: 'Dinner' })).not.toBeInTheDocument();
    expect(screen.getByText('Deleted Dinner')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByRole('heading', { name: 'Dinner' })).toBeInTheDocument();
    expect(writes(fetchMock)).toHaveLength(0);
  });

  it('deletes the activity on the server once the undo window passes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { fetchMock } = renderItinerary('organizer', { onWrite: () => jsonResponse(204) });

    await screen.findByText('Breakfast');
    await user.click(screen.getByRole('button', { name: 'More actions for Dinner' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(writes(fetchMock)).toHaveLength(0);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(writes(fetchMock).map(([url, options]) => [url, options.method])).toEqual([
      ['/api/trips/trip-1/itinerary/activity-2', 'DELETE'],
    ]);
    expect(screen.queryByRole('heading', { name: 'Dinner' })).not.toBeInTheDocument();
  });

  it('filters to the activities the person has not voted on', async () => {
    const user = userEvent.setup();
    const voted = { count: 1, voters: [ANA], hasVoted: true };
    renderItinerary('member', {
      activities: ACTIVITIES.map((a) => (a.id === 'activity-1' ? { ...a, votes: voted } : a)),
    });

    await screen.findByText('Breakfast');
    await user.click(screen.getByRole('button', { name: 'Not voted (2)' }));

    expect(screen.queryByRole('heading', { name: 'Breakfast' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dinner' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Museum' })).toBeInTheDocument();
  });

  it('marks the most-voted activity of a day as the group favorite', async () => {
    renderItinerary('member', {
      activities: ACTIVITIES.map((a) =>
        a.id === 'activity-2' ? { ...a, votes: { count: 2, voters: [ANA, SAM] } } : a,
      ),
    });

    const dinner = (await screen.findByRole('heading', { name: 'Dinner' })).closest('article');
    expect(within(dinner).getByText('Group favorite')).toBeInTheDocument();
    expect(within(dinner).getByText('out of 2', { exact: false })).toBeInTheDocument();
    const breakfast = screen.getByRole('heading', { name: 'Breakfast' }).closest('article');
    expect(within(breakfast).queryByText('Group favorite')).not.toBeInTheDocument();
  });
});
