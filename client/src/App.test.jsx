import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from './App.jsx';
import { fetchCurrentUser } from './api/auth.js';

vi.mock('./api/auth.js');

describe('App', () => {
  it('shows the TripVote app bar', async () => {
    fetchCurrentUser.mockResolvedValue(null);
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('banner')).toHaveTextContent('TripVote');
    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });
});
