import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/auth/passwords.js';

test('hash verifies with the original password only', async () => {
  const hash = await hashPassword('s3cret-password');
  assert.equal(await verifyPassword('s3cret-password', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});

test('hashes are salted and never contain the plaintext', async () => {
  const a = await hashPassword('same-password');
  const b = await hashPassword('same-password');
  assert.notEqual(a, b);
  assert.ok(a.startsWith('scrypt$'));
  assert.ok(!a.includes('same-password'));
});

test('rejects hashes from an unknown algorithm', async () => {
  assert.equal(await verifyPassword('anything', 'md5$abc$def'), false);
});
