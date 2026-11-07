import { describe, it, expect } from 'vitest';
import { validateSignup, validateLogin } from './authValidation.js';

describe('validateSignup', () => {
  it('accepts a complete form', () => {
    expect(
      validateSignup({ name: 'Ana', email: 'ana@example.com', password: 'correct-horse' }),
    ).toEqual({});
  });

  it('asks for every missing field', () => {
    expect(validateSignup({ name: ' ', email: '', password: '' })).toEqual({
      name: 'Enter your name.',
      email: 'Enter a valid email address.',
      password: 'Password must be at least 8 characters.',
    });
  });

  it('rejects an email without a domain', () => {
    expect(validateSignup({ name: 'Ana', email: 'ana@', password: 'correct-horse' })).toEqual({
      email: 'Enter a valid email address.',
    });
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(validateSignup({ name: 'Ana', email: 'ana@example.com', password: '1234567' })).toEqual({
      password: 'Password must be at least 8 characters.',
    });
  });
});

describe('validateLogin', () => {
  it('accepts an email and any non-empty password', () => {
    expect(validateLogin({ email: 'ana@example.com', password: 'x' })).toEqual({});
  });

  it('asks for a missing email and password', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Enter a valid email address.',
      password: 'Enter your password.',
    });
  });
});
