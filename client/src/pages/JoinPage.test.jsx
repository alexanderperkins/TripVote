import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import JoinPage from './JoinPage.jsx';

const VIEWER_TRIP = {
  name: 'Lisbon',
  organizerName: 'Ana Lopez',
  startDate: '2026-12-01',
  endDate: '2026-12-07',
  members: [
    { name: 'Ana Lopez', role: 'organizer' },
    { name: 'Sam Rivera', role: 'member' },
  ],
  viewerStatus: 'none',
};

function jsonResponse(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderJoinPage(response) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);

  render(
    <MemoryRouter initialEntries={['/join/valid-share-code']}>
      <Routes>
        <Route path="/join/:shareCode" element={<JoinPage />} />
      </Routes>
    </MemoryRouter>,
  );

  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('JoinPage', () => {
  it('shows the trip name, member names, and Members-only notice', async () => {
    const fetchMock = renderJoinPage({ status: 200, body: VIEWER_TRIP });

    expect(await screen.findByRole('heading', { name: 'Lisbon' })).toBeInTheDocument();
    expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    expect(screen.getByText('Sam Rivera')).toBeInTheDocument();
    expect(screen.getByText(/members[- ]only/i)).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/join/valid-share-code',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('shows a clear error for an invalid share code', async () => {
    renderJoinPage({
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'This invite link is invalid.' } },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('This invite link is invalid.');
  });

  it('sends a join request and shows that it was sent', async () => {
    const user = userEvent.setup();
    const fetchMock = renderJoinPage({ status: 200, body: VIEWER_TRIP });
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { viewerStatus: 'pending' }));

    await user.click(await screen.findByRole('button', { name: 'Request to join' }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/join/valid-share-code/requests',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(await screen.findByText('Request sent')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request to join' })).not.toBeInTheDocument();
  });

  it('shows that a request is waiting for the Organizer', async () => {
    renderJoinPage({ status: 200, body: { ...VIEWER_TRIP, viewerStatus: 'pending' } });

    expect(await screen.findByText('Request sent')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request to join' })).not.toBeInTheDocument();
  });

  it('links a Member straight to the trip instead of offering to join', async () => {
    renderJoinPage({
      status: 200,
      body: { ...VIEWER_TRIP, viewerStatus: 'member', tripId: 'trip-1' },
    });

    expect(await screen.findByRole('link', { name: 'Open trip' })).toHaveAttribute(
      'href',
      '/trips/trip-1',
    );
    expect(screen.queryByRole('button', { name: 'Request to join' })).not.toBeInTheDocument();
  });

  it('shows the error when the join request fails', async () => {
    const user = userEvent.setup();
    const fetchMock = renderJoinPage({ status: 200, body: VIEWER_TRIP });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, {
        error: { code: 'CONFLICT', message: 'You have already asked to join this trip.' },
      }),
    );

    await user.click(await screen.findByRole('button', { name: 'Request to join' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You have already asked to join this trip.',
    );
  });
});
