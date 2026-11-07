import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    const clipboardWrite = vi.fn().mockResolvedValue();
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite },
    });
    const user = userEvent.setup();

    try {
      renderTripDetail('member');
      await user.click(await screen.findByRole('button', { name: /copy link/i }));

      expect(clipboardWrite).toHaveBeenCalledWith(
        `${window.location.origin}/join/${TRIP.shareCode}`,
      );
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
      } else {
        delete navigator.clipboard;
      }
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
