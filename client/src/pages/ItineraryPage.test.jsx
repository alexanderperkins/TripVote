import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

function renderItinerary(role = 'member') {
  vi.stubGlobal(
    'fetch',
    vi.fn((url) => {
      const data = String(url).endsWith('/itinerary') ? ACTIVITIES : { ...TRIP, role };
      return Promise.resolve(
        new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }),
  );

  return render(
    <MemoryRouter initialEntries={['/trips/trip-1/itinerary']}>
      <AuthContext.Provider value={{ user: USER }}>
        <Routes>
          <Route path="/trips/:tripId/itinerary" element={<ItineraryPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('ItineraryPage', () => {
  it('groups activities by day in chronological order', async () => {
    renderItinerary();

    expect(await screen.findByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('Museum')).toBeInTheDocument();
    expect(screen.getByText('2026-12-01')).toBeInTheDocument();
    expect(screen.getByText('2026-12-02')).toBeInTheDocument();

    const breakfast = screen.getByText('Breakfast');
    const dinner = screen.getByText('Dinner');
    const museum = screen.getByText('Museum');
    expect(
      breakfast.compareDocumentPosition(dinner) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(dinner.compareDocumentPosition(museum) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows each activity time, location, notes, and who added it', async () => {
    renderItinerary();

    expect(await screen.findByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('08:30')).toBeInTheDocument();
    expect(screen.getByText('Cafe A Brasileira')).toBeInTheDocument();
    expect(screen.getByText('Outdoor seating.')).toBeInTheDocument();
    expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    expect(screen.getByText('19:00')).toBeInTheDocument();
    expect(screen.getByText('Time Out Market')).toBeInTheDocument();
    expect(screen.getByText('Meet near the entrance.')).toBeInTheDocument();
    expect(screen.getByText('Sam Rivera')).toBeInTheDocument();
  });

  it('provides a labeled Add activity form with required title, date, and time', async () => {
    renderItinerary();

    expect(await screen.findByRole('heading', { name: /itinerary/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeRequired();
    expect(screen.getByLabelText('Date')).toBeRequired();
    expect(screen.getByLabelText('Time')).toBeRequired();
    expect(screen.getByLabelText('Location')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add activity/i })).toBeInTheDocument();
  });

  it('shows Edit and Delete only for the current Member’s activities', async () => {
    renderItinerary();

    expect(await screen.findByText('Breakfast')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(1);
  });

  it('shows Edit and Delete for every activity for the Organizer', async () => {
    renderItinerary('organizer');

    expect(await screen.findByText('Breakfast')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(ACTIVITIES.length);
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(ACTIVITIES.length);
  });
});
