import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createLoginLimiter } from '../src/auth/rateLimit.js';
import { SESSION_TTL_MS, createSession, findSessionUser } from '../src/auth/sessions.js';
import { VALID_USER, sessionCookie, sessionToken, setup } from './helpers.js';

describe('POST /api/auth/signup', () => {
  test('creates the account, signs the user in, and returns no password data', async () => {
    const { agent, db } = setup();
    const res = await agent.post('/api/auth/signup').send(VALID_USER).expect(201);

    assert.deepEqual(res.body.user, { id: 1, email: VALID_USER.email, displayName: VALID_USER.displayName });
    const cookie = sessionCookie(res);
    assert.ok(cookie, 'session cookie set');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.doesNotMatch(cookie, /Secure/);

    const row = db.prepare('SELECT password_hash FROM users WHERE id = 1').get();
    assert.notEqual(row.password_hash, VALID_USER.password);

    const me = await agent.get('/api/auth/me').expect(200);
    assert.equal(me.body.user.email, VALID_USER.email);
  });

  test('sets a Secure cookie when configured for production', async () => {
    const { agent } = setup({ secureCookies: true });
    const res = await agent.post('/api/auth/signup').send(VALID_USER).expect(201);
    assert.match(sessionCookie(res), /Secure/);
  });

  test('rejects a duplicate email regardless of case', async () => {
    const { agent } = setup();
    await agent.post('/api/auth/signup').send(VALID_USER).expect(201);
    const res = await agent
      .post('/api/auth/signup')
      .send({ ...VALID_USER, email: 'ANA@example.com' })
      .expect(409);
    assert.ok(res.body.fields.email);
  });

  test('returns field errors for invalid input and creates nothing', async () => {
    const { agent, db } = setup();
    const res = await agent
      .post('/api/auth/signup')
      .send({ email: 'nope', password: 'short', displayName: '' })
      .expect(400);
    assert.deepEqual(Object.keys(res.body.fields).sort(), ['displayName', 'email', 'password']);
    assert.equal(sessionCookie(res), undefined);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
  });

  test('returns 400 for malformed JSON', async () => {
    const { agent } = setup();
    const res = await agent
      .post('/api/auth/signup')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    assert.equal(res.body.error, 'Malformed JSON body.');
  });
});

describe('POST /api/auth/login', () => {
  const signedUp = async (options) => {
    const ctx = setup(options);
    await ctx.agent.post('/api/auth/signup').send(VALID_USER).expect(201);
    await ctx.agent.post('/api/auth/logout').expect(204);
    return ctx;
  };

  test('signs in with correct credentials (email is case-insensitive)', async () => {
    const { agent } = await signedUp();
    const res = await agent
      .post('/api/auth/login')
      .send({ email: '  ANA@Example.com', password: VALID_USER.password })
      .expect(200);
    assert.equal(res.body.user.displayName, 'Ana');
    assert.ok(sessionCookie(res));
    await agent.get('/api/auth/me').expect(200);
  });

  test('gives the same error for a wrong password and an unknown email', async () => {
    const { agent } = await signedUp();
    const wrongPassword = await agent
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'wrong password' })
      .expect(401);
    const unknownEmail = await agent
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: VALID_USER.password })
      .expect(401);
    assert.equal(wrongPassword.body.error, unknownEmail.body.error);
    assert.equal(sessionCookie(wrongPassword), undefined);
    await agent.get('/api/auth/me').expect(401);
  });

  test('requires email and password', async () => {
    const { agent } = setup();
    await agent.post('/api/auth/login').send({ email: VALID_USER.email }).expect(400);
  });

  test('blocks an email after repeated failures, and a success resets the count', async () => {
    const loginLimiter = createLoginLimiter({ maxFailures: 3 });
    const { agent } = await signedUp({ loginLimiter });
    const bad = { email: VALID_USER.email, password: 'wrong password' };
    const good = { email: VALID_USER.email, password: VALID_USER.password };

    await agent.post('/api/auth/login').send(bad).expect(401);
    await agent.post('/api/auth/login').send(bad).expect(401);
    await agent.post('/api/auth/login').send(good).expect(200); // resets

    for (let i = 0; i < 3; i++) await agent.post('/api/auth/login').send(bad).expect(401);
    // Even the correct password is refused while blocked.
    await agent.post('/api/auth/login').send(good).expect(429);
  });

  test('replaces any existing session token on login', async () => {
    const { agent, db } = await signedUp();
    const first = sessionToken(await agent.post('/api/auth/login').send(VALID_USER).expect(200));
    const second = sessionToken(await agent.post('/api/auth/login').send(VALID_USER).expect(200));

    assert.notEqual(first, second);
    assert.equal(findSessionUser(db, first), null);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 1);
  });
});

describe('login rate limiter', () => {
  test('unblocks after the window passes', () => {
    let clock = 0;
    const limiter = createLoginLimiter({ maxFailures: 2, windowMs: 1000, now: () => clock });
    limiter.recordFailure('a');
    limiter.recordFailure('a');
    assert.equal(limiter.isBlocked('a'), true);
    assert.equal(limiter.isBlocked('b'), false);
    clock = 1000;
    assert.equal(limiter.isBlocked('a'), false);
  });
});

describe('sessions', () => {
  test('logout invalidates the session server-side, not just the cookie', async () => {
    const { agent, app } = setup();
    const res = await agent.post('/api/auth/signup').send(VALID_USER).expect(201);
    const token = sessionToken(res);

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);

    // Replaying the old cookie must not work.
    await request(app).get('/api/auth/me').set('Cookie', `tripvote_session=${token}`).expect(401);
  });

  test('/me is 401 without a cookie or with a bogus one', async () => {
    const { app } = setup();
    await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set('Cookie', 'tripvote_session=made-up').expect(401);
    await request(app).get('/api/auth/me').set('Cookie', 'tripvote_session=%E0%A4%A').expect(401);
  });

  test('expired sessions are rejected and cleaned up', () => {
    const { db } = setup();
    db.prepare("INSERT INTO users (email, display_name, password_hash) VALUES ('a@b.co', 'A', 'x')").run();
    const { token } = createSession(db, 1, 0);
    assert.ok(findSessionUser(db, token, SESSION_TTL_MS - 1));
    assert.equal(findSessionUser(db, token, SESSION_TTL_MS), null);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
  });

  test('only a hash of the token is stored', async () => {
    const { agent, db } = setup();
    const token = sessionToken(await agent.post('/api/auth/signup').send(VALID_USER).expect(201));
    const stored = db.prepare('SELECT token_hash FROM sessions').get().token_hash;
    assert.notEqual(stored, token);
  });
});

describe('pages', () => {
  test('serves the sign-up and login pages', async () => {
    const { agent } = setup();
    const signup = await agent.get('/signup').expect(200);
    assert.match(signup.text, /data-auth="signup"/);
    const login = await agent.get('/login').expect(200);
    assert.match(login.text, /data-auth="login"/);
  });

  test('unknown API routes return JSON 404', async () => {
    const { agent } = setup();
    const res = await agent.get('/api/nope').expect(404);
    assert.equal(res.body.error, 'Not found.');
  });
});
