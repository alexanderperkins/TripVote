import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from './App.jsx';

describe('App', () => {
  it('shows the TripVote app bar', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('banner')).toHaveTextContent('TripVote');
  });
});
