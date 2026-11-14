import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionStatus from './ConnectionStatus.jsx';

describe('ConnectionStatus', () => {
  it('shows Live when connected', () => {
    render(<ConnectionStatus status="live" />);

    expect(screen.getByRole('status')).toHaveTextContent('Live');
    expect(screen.queryByText(/live updates are paused/i)).not.toBeInTheDocument();
  });

  it('shows Connecting while the first connection is made', () => {
    render(<ConnectionStatus status="connecting" />);

    expect(screen.getByRole('status')).toHaveTextContent('Connecting');
  });

  it('shows Reconnecting and explains the page still works when the connection drops', () => {
    render(<ConnectionStatus status="reconnecting" />);

    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Live updates are paused. You can keep planning; changes from others will show when you reconnect.',
    );
  });

  it('says live updates are unavailable when the server refuses them', () => {
    render(<ConnectionStatus status="unavailable" />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Live updates are unavailable. Reload the page to see changes from others.',
    );
  });
});
