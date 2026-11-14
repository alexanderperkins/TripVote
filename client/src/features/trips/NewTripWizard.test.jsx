import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import NewTripWizard from './NewTripWizard.jsx';

const CREATED = {
  id: 'trip-9',
  name: 'Lisbon trip',
  destination: 'Lisbon, Portugal',
  startDate: '2027-06-10',
  endDate: '2027-06-13',
  role: 'organizer',
};

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderWizard() {
  const onCreated = vi.fn();
  const onClose = vi.fn();
  const fetchMock = vi.fn(async (url, options) =>
    options.method === 'POST'
      ? jsonResponse(201, CREATED)
      : jsonResponse(200, { ...CREATED, shareCode: 'abc123' }),
  );
  vi.stubGlobal('fetch', fetchMock);
  render(
    <MemoryRouter>
      <NewTripWizard onCreated={onCreated} onClose={onClose} />
    </MemoryRouter>,
  );
  return { fetchMock, onCreated, onClose };
}

afterEach(() => vi.unstubAllGlobals());

describe('NewTripWizard', () => {
  it('asks for the destination first and needs one to go on', async () => {
    const user = userEvent.setup();
    renderWizard();

    expect(screen.getByText('Step 1 of 3 · Where are you going?')).toBeInTheDocument();
    expect(screen.getByLabelText('Destination')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByLabelText('Destination')).toHaveAccessibleDescription(
      'Enter a destination.',
    );
  });

  it('rejects an end date before the start date', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole('button', { name: 'Lisbon, Portugal' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Start date'), '2027-06-13');
    await user.type(screen.getByLabelText('End date'), '2027-06-10');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('alert')).toHaveTextContent("End date can't be before the start date.");
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('suggests a name, creates the trip and shows the share link', async () => {
    const user = userEvent.setup();
    const { fetchMock, onCreated } = renderWizard();

    await user.click(screen.getByRole('button', { name: 'Lisbon, Portugal' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Start date'), '2027-06-10');
    await user.type(screen.getByLabelText('End date'), '2027-06-13');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByLabelText('Name')).toHaveValue('Lisbon trip');
    await user.click(screen.getByRole('button', { name: 'Create trip' }));

    expect(await screen.findByText('Lisbon trip is ready')).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: 'Lisbon trip',
      destination: 'Lisbon, Portugal',
      startDate: '2027-06-10',
      endDate: '2027-06-13',
    });
    expect(onCreated).toHaveBeenCalledWith(CREATED);
    expect(screen.getByText(`${window.location.origin}/join/abc123`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open trip' })).toHaveAttribute(
      'href',
      '/trips/trip-9',
    );
  });

  it('goes back a step without losing what was typed', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText('Destination'), 'Porto');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByLabelText('Destination')).toHaveValue('Porto');
  });
});
