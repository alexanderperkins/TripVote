import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { User } from '../../src/models/User.js';
import { startTestDb, clearTestDb, stopTestDb } from '../helpers/testDb.js';
import { createTestApp } from '../helpers/testApp.js';

const NEW_USER = { name: 'Ana Lopez', email: 'ana@example.com', password: 'correct-horse' };

function authCookie(res) {
  return res.headers['set-cookie']?.find((cookie) => cookie.startsWith('token='));
}

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('POST /api/auth/register', () => {
  it('creates an account and returns the user without the password', async () => {
    const res = await request(createTestApp()).post('/api/auth/register').send(NEW_USER);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      name: 'Ana Lopez',
      email: 'ana@example.com',
    });
  });

  it('logs the new user in with an httpOnly SameSite cookie', async () => {
    const res = await request(createTestApp()).post('/api/auth/register').send(NEW_USER);

    const cookie = authCookie(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('marks the cookie Secure when secure cookies are enabled', async () => {
    const app = createTestApp({ isCookieSecure: true });
    const res = await request(app).post('/api/auth/register').send(NEW_USER);

    expect(authCookie(res)).toMatch(/Secure/);
  });

  it('stores the password as a bcrypt hash, never in plain text', async () => {
    await request(createTestApp()).post('/api/auth/register').send(NEW_USER);

    const stored = await User.findOne({ email: NEW_USER.email }).select('+passwordHash').lean();
    expect(stored.passwordHash).not.toBe(NEW_USER.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$1\d\$/);
    expect(stored).not.toHaveProperty('password');
  });

  it('rejects a duplicate email with 409, ignoring case', async () => {
    const app = createTestApp();
    await request(app).post('/api/auth/register').send(NEW_USER);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...NEW_USER, email: 'ANA@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'EMAIL_TAKEN',
      message: 'An account with this email already exists.',
      fields: { email: 'An account with this email already exists.' },
    });
  });

  it.each([
    ['name', { ...NEW_USER, name: '  ' }, 'Enter your name.'],
    ['email', { ...NEW_USER, email: 'not-an-email' }, 'Enter a valid email address.'],
    ['password', { ...NEW_USER, password: 'short' }, 'Password must be at least 8 characters.'],
  ])('rejects an invalid %s with a clear message', async (field, body, message) => {
    const res = await request(createTestApp()).post('/api/auth/register').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields[field]).toBe(message);
  });

  it('rejects missing fields', async () => {
    const res = await request(createTestApp())
      .post('/api/auth/register')
      .send({ email: NEW_USER.email });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({
      name: 'Enter your name.',
      password: 'Password must be at least 8 characters.',
    });
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the right email and password', async () => {
    const app = createTestApp();
    await request(app).post('/api/auth/register').send(NEW_USER);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'Ana@Example.com', password: NEW_USER.password });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.any(String),
      name: 'Ana Lopez',
      email: 'ana@example.com',
    });
    expect(authCookie(res)).toBeDefined();
  });

  it.each([
    ['a wrong password', { email: NEW_USER.email, password: 'wrong-password' }],
    ['an unknown email', { email: 'nobody@example.com', password: NEW_USER.password }],
  ])('rejects %s with the same generic message', async (_label, credentials) => {
    const app = createTestApp();
    await request(app).post('/api/auth/register').send(NEW_USER);

    const res = await request(app).post('/api/auth/login').send(credentials);

    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    });
    expect(authCookie(res)).toBeUndefined();
  });

  it('rejects an empty form with field errors', async () => {
    const res = await request(createTestApp()).post('/api/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({
      email: 'Enter a valid email address.',
      password: 'Enter your password.',
    });
  });

  it('rate limits repeated attempts', async () => {
    const app = createTestApp({ authRateLimit: 2 });
    const attempt = () => request(app).post('/api/auth/login').send({});

    await attempt();
    await attempt();
    const res = await attempt();

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});

describe('GET /api/auth/me', () => {
  it('keeps the user logged in across requests', async () => {
    const agent = request.agent(createTestApp());
    await agent.post('/api/auth/register').send(NEW_USER);

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: expect.any(String),
      name: 'Ana Lopez',
      email: 'ana@example.com',
    });
  });

  it('rejects a request without a session with 401', async () => {
    const res = await request(createTestApp()).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({
      code: 'UNAUTHENTICATED',
      message: 'Please log in to continue.',
    });
  });

  it('rejects a tampered token', async () => {
    const res = await request(createTestApp())
      .get('/api/auth/me')
      .set('Cookie', 'token=not.a.real.token');

    expect(res.status).toBe(401);
  });

  it('rejects a token signed with another secret', async () => {
    const otherApp = createTestApp({ jwtSecret: 'some-other-secret-value-1234567890' });
    const register = await request(otherApp).post('/api/auth/register').send(NEW_USER);

    const res = await request(createTestApp())
      .get('/api/auth/me')
      .set('Cookie', authCookie(register));

    expect(res.status).toBe(401);
  });

  it('rejects a token for a user that no longer exists', async () => {
    const agent = request.agent(createTestApp());
    await agent.post('/api/auth/register').send(NEW_USER);
    await User.deleteMany({});

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('ends the session by clearing the cookie', async () => {
    const agent = request.agent(createTestApp());
    await agent.post('/api/auth/register').send(NEW_USER);

    const logout = await agent.post('/api/auth/logout');
    const me = await agent.get('/api/auth/me');

    expect(logout.status).toBe(204);
    expect(authCookie(logout)).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(me.status).toBe(401);
  });
});
