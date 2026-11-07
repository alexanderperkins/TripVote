import { afterEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewTripForm from './NewTripForm.jsx';

afterEach(() => vi.unstubAllGlobals());

async function fillTripForm(user, { endDate = '2026-12-07' } = {}) {
  await user.type(screen.getByLabelText('Name'), 'Lisbon');
  await user.type(screen.getByLabelText('Destination'), 'Portugal');
  fireEvent.change(screen.getByLabelText('Start date'), {
    target: { value: '2026-12-01' },
  });
  fireEvent.change(screen.getByLabelText('End date'), {
    target: { value: endDate },
  });
}

describe('NewTripForm', () => {
  it('provides labeled fields for trip details', () => {
    render(<NewTripForm />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Destination')).toBeInTheDocument();
    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    expect(screen.getByLabelText('End date')).toBeInTheDocument();
  });

  it('shows an error when the end date is before the start date', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<NewTripForm />);

    await fillTripForm(user, { endDate: '2026-11-30' });
    await user.click(screen.getByRole('button', { name: /create trip/i }));

    expect(await screen.findByText("End date can't be before the start date.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('disables the submit button while saving', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const user = userEvent.setup();
    render(<NewTripForm />);

    await fillTripForm(user);
    await user.click(screen.getByRole('button', { name: /create trip/i }));

    expect(screen.getByRole('button', { name: /create trip/i })).toBeDisabled();
  });
});
