// Deliberately permissive: one "@", no whitespace, and a dot in the domain.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN = 8;
// scrypt hashes the whole input, so cap it to keep request cost bounded.
export const PASSWORD_MAX = 128;
export const DISPLAY_NAME_MAX = 50;
export const EMAIL_MAX = 254;

export const normalizeEmail = (email) => email.trim().toLowerCase();

/** Returns { value, errors } where errors maps field name to a message. */
export function validateSignup(body) {
  const errors = {};
  const { email, password, displayName } = body ?? {};

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.trim().length > EMAIL_MAX) {
    errors.email = 'Enter a valid email address.';
  }
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  } else if (password.length > PASSWORD_MAX) {
    errors.password = `Password must be at most ${PASSWORD_MAX} characters.`;
  }
  if (typeof displayName !== 'string' || displayName.trim().length === 0) {
    errors.displayName = 'Display name is required.';
  } else if (displayName.trim().length > DISPLAY_NAME_MAX) {
    errors.displayName = `Display name must be at most ${DISPLAY_NAME_MAX} characters.`;
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    value: { email: normalizeEmail(email), password, displayName: displayName.trim() },
    errors: null,
  };
}

export function validateLogin(body) {
  const { email, password } = body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return { errors: { form: 'Email and password are required.' } };
  }
  return { value: { email: normalizeEmail(email), password }, errors: null };
}
