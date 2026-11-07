import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from '../../App.jsx';
import { ApiError } from '../../api/client.js';
import { registerUser, loginUser, logoutUser, fetchCurrentUser } from '../../api/auth.js';

vi.mock('../../api/auth.js');

const ANA = { id: 'u1', name: 'Ana Lopez', email: 'ana@example.com' };

function renderAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.resetAllMocks();
  fetchCurrentUser.mockResolvedValue(null);
});

describe('Sign up', () => {
  it('shows inline errors for empty fields without calling the API', async () => {
    const user = renderAt('/signup');

    await user.click(await screen.findByRole('button', { name: 'Create account' }));

    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Enter your name.');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Password must be at least 8 characters.',
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('shows a duplicate email error next to the email field', async () => {
    registerUser.mockRejectedValue(
      new ApiError(409, {
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists.',
        fields: { email: 'An account with this email already exists.' },
      }),
    );
    const user = renderAt('/signup');

    await user.type(await screen.findByLabelText('Name'), 'Ana Lopez');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByLabelText('Email')).toHaveAccessibleDescription(
      'An account with this email already exists.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'An account with this email already exists.',
    );
  });

  it('disables the submit button while saving', async () => {
    registerUser.mockReturnValue(new Promise(() => {}));
    const user = renderAt('/signup');

    await user.type(await screen.findByLabelText('Name'), 'Ana Lopez');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();
  });

  it('creates the account and goes to the dashboard', async () => {
    registerUser.mockResolvedValue(ANA);
    const user = renderAt('/signup');

    await user.type(await screen.findByLabelText('Name'), 'Ana Lopez');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(registerUser).toHaveBeenCalledWith({
      name: 'Ana Lopez',
      email: 'ana@example.com',
      password: 'correct-horse',
    });
    expect(await screen.findByRole('heading', { name: 'Your trips' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('Ana Lopez');
  });

  it('switches to the log in tab', async () => {
    const user = renderAt('/signup');

    await user.click(await screen.findByRole('link', { name: 'Log in' }));

    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });
});

describe('Log in', () => {
  it('shows a clear error for wrong credentials', async () => {
    loginUser.mockRejectedValue(
      new ApiError(401, {
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      }),
    );
    const user = renderAt('/login');

    await user.type(await screen.findByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  });

  it('shows a fallback error when the server cannot be reached', async () => {
    loginUser.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = renderAt('/login');

    await user.type(await screen.findByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });

  it('returns to the page that required login', async () => {
    loginUser.mockResolvedValue(ANA);
    const user = renderAt('/trips');

    await user.type(await screen.findByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(loginUser).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'correct-horse' });
    expect(await screen.findByRole('heading', { name: 'Your trips' })).toBeInTheDocument();
  });
});

describe('Session', () => {
  it('keeps a logged-in user logged in after a reload', async () => {
    fetchCurrentUser.mockResolvedValue(ANA);
    renderAt('/trips');

    expect(await screen.findByRole('heading', { name: 'Your trips' })).toBeInTheDocument();
  });

  it('sends a logged-out user from a protected page to the log in form', async () => {
    renderAt('/trips');

    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your trips' })).not.toBeInTheDocument();
  });

  it('sends a logged-in user away from the log in page', async () => {
    fetchCurrentUser.mockResolvedValue(ANA);
    renderAt('/login');

    expect(await screen.findByRole('heading', { name: 'Your trips' })).toBeInTheDocument();
  });

  it('logs out and returns to the log in form', async () => {
    fetchCurrentUser.mockResolvedValue(ANA);
    logoutUser.mockResolvedValue();
    const user = renderAt('/trips');

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(logoutUser).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).not.toHaveTextContent('Ana Lopez');
  });
});
