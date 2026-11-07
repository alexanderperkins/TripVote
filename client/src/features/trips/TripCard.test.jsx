import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import TripCard from './TripCard.jsx';

const TRIP = {
  id: 'trip-1',
  name: 'Lisbon',
  destination: 'Portugal',
  startDate: '2026-12-01',
  endDate: '2026-12-07',
  role: 'organizer',
  memberCount: 2,
};

describe('TripCard', () => {
  it('shows the trip details, dates, role badge, member count, and detail link', () => {
    const { container } = render(
      <MemoryRouter>
        <TripCard trip={TRIP} />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /lisbon/i });
    expect(link).toHaveAttribute('href', '/trips/trip-1');
    expect(screen.getByText('Portugal')).toBeInTheDocument();
    const startDate = container.querySelector('time[datetime="2026-12-01"]');
    const endDate = container.querySelector('time[datetime="2026-12-07"]');
    expect(startDate).toBeInTheDocument();
    expect(startDate.textContent.trim()).not.toBe('');
    expect(endDate).toBeInTheDocument();
    expect(endDate.textContent.trim()).not.toBe('');
    expect(screen.getByText('Organizer')).toBeInTheDocument();
    expect(screen.getByText('2 members')).toBeInTheDocument();
  });
});
