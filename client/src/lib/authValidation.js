// Mirrors the server's zod rules so users see errors before submitting.
// The server still validates every request.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function emailError(email) {
  return EMAIL_PATTERN.test(email.trim()) ? undefined : 'Enter a valid email address.';
}

function withoutEmpty(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateSignup({ name, email, password }) {
  return withoutEmpty({
    name: name.trim() ? undefined : 'Enter your name.',
    email: emailError(email),
    password:
      password.length >= MIN_PASSWORD_LENGTH
        ? undefined
        : 'Password must be at least 8 characters.',
  });
}

export function validateLogin({ email, password }) {
  return withoutEmpty({
    email: emailError(email),
    password: password ? undefined : 'Enter your password.',
  });
}
