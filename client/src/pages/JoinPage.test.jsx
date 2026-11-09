import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
};

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
  it('shows the trip name, member names, and Members-only notice without join actions', async () => {
    const fetchMock = renderJoinPage({ status: 200, body: VIEWER_TRIP });

    expect(await screen.findByRole('heading', { name: 'Lisbon' })).toBeInTheDocument();
    expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
    expect(screen.getByText('Sam Rivera')).toBeInTheDocument();
    expect(screen.getByText(/members[- ]only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /join|accept/i })).not.toBeInTheDocument();
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
});
