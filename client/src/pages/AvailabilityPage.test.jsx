import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import AvailabilityPage from './AvailabilityPage.jsx';
import ToastProvider from '../components/ToastProvider.jsx';
import { AuthContext } from '../features/auth/authContext.js';
import { connectSocket, lastSocket } from '../test/fakeSocket.js';

const USER = { id: 'user-1', name: 'Ana Lopez', email: 'ana@example.com' };
const ANA = { userId: 'user-1', name: 'Ana Lopez' };
const SAM = { userId: 'user-2', name: 'Sam Rivera' };
const KAI = { userId: 'user-3', name: 'Kai Chen' };
const TRIP = {
  id: 'trip-1',
  name: 'Lisbon',
  destination: 'Portugal',
  startDate: '2026-12-01',
  endDate: '2026-12-03',
  role: 'member',
  members: [
    { ...ANA, role: 'member' },
    { ...SAM, role: 'organizer' },
    { ...KAI, role: 'member' },
  ],
};

function summary({ responses, notResponded }) {
  const dates = ['2026-12-01', '2026-12-02', '2026-12-03'];
  const days = dates.map((date) => {
    const members = responses
      .filter((r) => r.dates.includes(date))
      .map(({ userId, name }) => ({
        userId,
        name,
      }));
    return { date, count: members.length, members };
  });
  const most = Math.max(0, ...days.map((d) => d.count));
  return {
    days,
    bestDates: most ? days.filter((d) => d.count === most).map((d) => d.date) : [],
    responses,
    notResponded,
    memberCount: 3,
  };
}

const START = summary({
  responses: [{ ...SAM, dates: ['2026-12-02', '2026-12-03'] }],
  notResponded: [ANA, KAI],
});

function json(data, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function renderPage({ initial = START, onSave } = {}) {
  const fetchMock = vi.fn((url, options = {}) => {
    const path = String(url);
    if (path.endsWith('/availability/me') && options.method === 'PUT') {
      const { dates } = JSON.parse(options.body);
      return onSave ? onSave(dates) : json(withMine(initial, dates));
    }
    if (path.endsWith('/availability')) return json(initial);
    return json(TRIP);
  });
  vi.stubGlobal('fetch', fetchMock);

  render(
    <MemoryRouter initialEntries={['/trips/trip-1/availability']}>
      <AuthContext.Provider value={{ user: USER }}>
        <ToastProvider>
          <Routes>
            <Route path="/trips/:tripId/availability" element={<AvailabilityPage />} />
          </Routes>
        </ToastProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return { fetchMock };
}

function withMine(base, dates) {
  const others = base.responses.filter((r) => r.userId !== ANA.userId);
  return summary({
    responses: [...others, { ...ANA, dates }],
    notResponded: base.notResponded.filter((p) => p.userId !== ANA.userId),
  });
}

const dayButton = (name) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

describe('AvailabilityPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the trip header with an Availability tab', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Lisbon' })).toBeInTheDocument();
    const tabs = screen.getByRole('navigation', { name: 'Trip sections' });
    expect(within(tabs).getByRole('link', { name: 'Availability' })).toHaveAttribute(
      'href',
      '/trips/trip-1/availability',
    );
  });

  it('shows a day for every date of the trip with how many Members are free', async () => {
    renderPage();

    const grid = await screen.findByRole('group', { name: 'Trip days' });
    const days = within(grid).getAllByRole('button');
    expect(days).toHaveLength(3);
    expect(days[0]).toHaveAccessibleName(/^Tue, Dec 1\. Not marked\. 0 of 3 free\.$/);
    expect(days[1]).toHaveAccessibleName(
      /^Wed, Dec 2\. Not marked\. 1 of 3 free: Sam Rivera\. Best day\.$/,
    );
    expect(days[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('tags the days with the most overlap as best and sums them up', async () => {
    renderPage();

    const grid = await screen.findByRole('group', { name: 'Trip days' });
    expect(within(grid).getAllByText('BEST')).toHaveLength(2);
    const best = screen.getByRole('region', { name: 'Best dates' });
    expect(best).toHaveTextContent('Dec 2 – Dec 3');
    expect(best).toHaveTextContent('1 of 3 free');
  });

  it('lists the Members who have not responded yet', async () => {
    renderPage();

    const waiting = await screen.findByRole('region', { name: 'Waiting on' });
    const people = within(waiting).getAllByRole('listitem');
    expect(people).toHaveLength(2);
    expect(people[0]).toHaveTextContent('Ana Lopez (you)');
    expect(people[1]).toHaveTextContent('Kai Chen');
  });

  it('marks a day as free when the Member taps it and saves it', async () => {
    const user = userEvent.setup();
    const { fetchMock } = renderPage();
    await screen.findByRole('group', { name: 'Trip days' });

    await user.click(dayButton('Wed, Dec 2'));

    expect(dayButton('Wed, Dec 2')).toHaveAttribute('aria-pressed', 'true');
    expect(dayButton('Wed, Dec 2')).toHaveAccessibleName(/You're free\. 2 of 3 free/);
    const save = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(save[0]).toBe('/api/trips/trip-1/availability/me');
    expect(JSON.parse(save[1].body)).toEqual({ dates: ['2026-12-02'] });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Best dates' })).toHaveTextContent('Dec 2');
    expect(screen.getByRole('region', { name: 'Waiting on' })).not.toHaveTextContent('Ana Lopez');
  });

  it('unmarks a day the Member already marked', async () => {
    const user = userEvent.setup();
    renderPage({ initial: withMine(START, ['2026-12-01']) });
    await screen.findByRole('group', { name: 'Trip days' });

    expect(dayButton('Tue, Dec 1')).toHaveAttribute('aria-pressed', 'true');
    await user.click(dayButton('Tue, Dec 1'));

    expect(dayButton('Tue, Dec 1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('puts the day back and shows the error when saving fails', async () => {
    const user = userEvent.setup();
    renderPage({
      onSave: () =>
        json({ error: { code: 'SERVER_ERROR', message: 'Could not save your dates.' } }, 500),
    });
    await screen.findByRole('group', { name: 'Trip days' });

    await user.click(dayButton('Tue, Dec 1'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your dates.');
    expect(dayButton('Tue, Dec 1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clears all of the Member’s days', async () => {
    const user = userEvent.setup();
    const { fetchMock } = renderPage({ initial: withMine(START, ['2026-12-01', '2026-12-02']) });
    await screen.findByRole('group', { name: 'Trip days' });

    await user.click(screen.getByRole('button', { name: 'Clear my days' }));

    const save = fetchMock.mock.calls.findLast(([, options]) => options?.method === 'PUT');
    expect(JSON.parse(save[1].body)).toEqual({ dates: [] });
    expect(dayButton('Tue, Dec 1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows other Members’ changes live with a toast', async () => {
    renderPage();
    await screen.findByRole('group', { name: 'Trip days' });
    act(() => connectSocket());

    act(() =>
      lastSocket().serverEmit(
        'availability:updated',
        summary({
          responses: [
            { ...SAM, dates: ['2026-12-02', '2026-12-03'] },
            { ...KAI, dates: ['2026-12-01'] },
          ],
          notResponded: [ANA],
        }),
      ),
    );

    expect(dayButton('Tue, Dec 1')).toHaveAccessibleName(/1 of 3 free: Kai Chen/);
    expect(screen.getByText('Kai Chen updated their free days')).toBeInTheDocument();
  });

  it('tells everyone when all Members have responded', async () => {
    renderPage({
      initial: summary({
        responses: [
          { ...ANA, dates: ['2026-12-01'] },
          { ...SAM, dates: ['2026-12-01'] },
          { ...KAI, dates: [] },
        ],
        notResponded: [],
      }),
    });

    const waiting = await screen.findByRole('region', { name: 'Waiting on' });
    expect(waiting).toHaveTextContent('Everyone has responded.');
  });

  it('shows the server error when the trip cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have permission to access this trip.',
            },
          },
          403,
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/trips/trip-1/availability']}>
        <AuthContext.Provider value={{ user: USER }}>
          <ToastProvider>
            <Routes>
              <Route path="/trips/:tripId/availability" element={<AvailabilityPage />} />
            </Routes>
          </ToastProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission to access this trip.',
    );
  });
});
