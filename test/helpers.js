import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

export const VALID_USER = {
  email: 'ana@example.com',
  password: 'correct horse battery',
  displayName: 'Ana',
};

/** Fresh in-memory app per test, plus a cookie-keeping agent. */
export function setup(options = {}) {
  const db = openDb(':memory:');
  const app = createApp({ db, ...options });
  return { db, app, agent: request.agent(app) };
}

export const sessionCookie = (res) =>
  (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('tripvote_session='));

export const sessionToken = (res) => sessionCookie(res)?.split(';')[0].split('=')[1];
