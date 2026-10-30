import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLogin, validateSignup } from '../src/auth/validation.js';

const valid = { email: 'a@b.co', password: '12345678', displayName: 'Ana' };

test('accepts valid signup and normalizes email and name', () => {
  const { value, errors } = validateSignup({ ...valid, email: '  Ana@Example.COM ', displayName: '  Ana  ' });
  assert.equal(errors, null);
  assert.deepEqual(value, { email: 'ana@example.com', password: '12345678', displayName: 'Ana' });
});

test('reports each invalid signup field', () => {
  const cases = [
    [{ email: 'not-an-email' }, 'email'],
    [{ email: 'a@b' }, 'email'],
    [{ email: 'a b@c.com' }, 'email'],
    [{ email: `${'a'.repeat(250)}@b.co` }, 'email'],
    [{ password: '1234567' }, 'password'],
    [{ password: 'x'.repeat(129) }, 'password'],
    [{ password: 12345678 }, 'password'],
    [{ displayName: '   ' }, 'displayName'],
    [{ displayName: 'x'.repeat(51) }, 'displayName'],
  ];
  for (const [override, field] of cases) {
    const { errors } = validateSignup({ ...valid, ...override });
    assert.ok(errors?.[field], `expected ${field} error for ${JSON.stringify(override)}`);
    assert.deepEqual(Object.keys(errors), [field]);
  }
});

test('handles a missing body', () => {
  assert.deepEqual(Object.keys(validateSignup(undefined).errors).sort(), ['displayName', 'email', 'password']);
  assert.ok(validateLogin(undefined).errors);
});

test('login requires both fields as strings', () => {
  assert.ok(validateLogin({ email: 'a@b.co' }).errors);
  assert.ok(validateLogin({ email: 'a@b.co', password: '' }).errors);
  assert.ok(validateLogin({ email: ['a@b.co'], password: 'x' }).errors);
  assert.deepEqual(validateLogin({ email: ' A@B.co ', password: 'x' }).value, { email: 'a@b.co', password: 'x' });
});
