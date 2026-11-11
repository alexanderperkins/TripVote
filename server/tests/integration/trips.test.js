import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Trip } from '../../src/models/Trip.js';
import { TripMembership } from '../../src/models/TripMembership.js';
import { startTestDb, clearTestDb, stopTestDb } from '../helpers/testDb.js';
import { createTestApp } from '../helpers/testApp.js';

const app = () => createTestApp();
const validTrip = {
  name: 'Lisbon',
  destination: 'Portugal',
  startDate: '2026-12-01',
  endDate: '2026-12-07',
};

let nextUserId = 0;

function authCookie(res) {
  return res.headers['set-cookie']?.find((cookie) => cookie.startsWith('token='));
}

async function createUser() {
  const credentials = {
    name: 'Test User',
    email: `trip-test-${nextUserId++}@example.com`,
    password: 'correct-horse',
  };
  const register = await request(app()).post('/api/auth/register').send(credentials);
  const login = await request(app()).post('/api/auth/login').send(credentials);

  return { id: register.body.id, cookie: authCookie(login) };
}

const createTrip = (user, body = validTrip) =>
  request(app()).post('/api/trips').set('Cookie', user.cookie).send(body);

// Issue 6 will add a real join flow; until then, add a Member directly.
const addMember = (tripId, userId) =>
  TripMembership.create({ trip: tripId, user: userId, role: 'member', status: 'active' });

describe('trips API', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(clearTestDb);

  describe('POST /api/trips', () => {
    it('creates a trip and makes the creator the Organizer', async () => {
      const user = await createUser();
      const res = await createTrip(user);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ ...validTrip, role: 'organizer' });
      expect(res.body.id).toBeTruthy();
    });

    it('assigns each trip a unique random share code', async () => {
      const user = await createUser();
      const firstTrip = await createTrip(user);
      const secondTrip = await createTrip(user, { ...validTrip, name: 'Porto' });
      const firstStoredTrip = await Trip.findById(firstTrip.body.id);
      const secondStoredTrip = await Trip.findById(secondTrip.body.id);

      expect(firstStoredTrip.shareCode).toMatch(/^[a-f0-9]{32}$/);
      expect(secondStoredTrip.shareCode).toMatch(/^[a-f0-9]{32}$/);
      expect(secondStoredTrip.shareCode).not.toBe(firstStoredTrip.shareCode);
    });

    it('rejects an end date before the start date', async () => {
      const user = await createUser();
      const res = await createTrip(user, { ...validTrip, endDate: '2026-11-30' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('accepts an end date equal to the start date', async () => {
      const user = await createUser();
      const res = await createTrip(user, { ...validTrip, endDate: '2026-12-01' });

      expect(res.status).toBe(201);
    });

    it.each(['name', 'destination'])('rejects a missing %s', async (field) => {
      const body = { ...validTrip, [field]: '' };
      const user = await createUser();
      const res = await createTrip(user, body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 when not logged in', async () => {
      const res = await request(app()).post('/api/trips').send(validTrip);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/trips', () => {
    it("lists only the caller's trips with the caller's role", async () => {
      const alex = await createUser();
      const someoneElse = await createUser();
      await createTrip(alex);
      await createTrip(someoneElse, { ...validTrip, name: 'Someone else' });

      const res = await request(app()).get('/api/trips').set('Cookie', alex.cookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ name: 'Lisbon', role: 'organizer', memberCount: 1 });
    });

    it('returns 401 when not logged in', async () => {
      const res = await request(app()).get('/api/trips');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/trips/:tripId', () => {
    it('returns the trip with its Members to a Member', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      const res = await request(app()).get(`/api/trips/${trip.id}`).set('Cookie', member.cookie);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Lisbon', role: 'member' });
      expect(res.body.members).toHaveLength(2);
    });

    it('returns 403 to someone who is not in the trip', async () => {
      const organizer = await createUser();
      const someoneElse = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .get(`/api/trips/${trip.id}`)
        .set('Cookie', someoneElse.cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 for an id that is not valid', async () => {
      const user = await createUser();
      const res = await request(app()).get('/api/trips/not-an-id').set('Cookie', user.cookie);

      expect(res.status).toBe(404);
    });

    it('includes the share code for Members and the Organizer', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      const memberRes = await request(app())
        .get(`/api/trips/${trip.id}`)
        .set('Cookie', member.cookie);
      const organizerRes = await request(app())
        .get(`/api/trips/${trip.id}`)
        .set('Cookie', organizer.cookie);

      expect(memberRes.status).toBe(200);
      expect(memberRes.body.shareCode).toMatch(/^[a-f0-9]{32}$/);
      expect(organizerRes.status).toBe(200);
      expect(organizerRes.body.shareCode).toBe(memberRes.body.shareCode);
    });

    it('does not disclose trip data to someone outside the trip', async () => {
      const organizer = await createUser();
      const someoneElse = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .get(`/api/trips/${trip.id}`)
        .set('Cookie', someoneElse.cookie);

      expect(res.status).toBe(403);
      expect(res.body).not.toHaveProperty('itinerary');
      expect(res.body).not.toHaveProperty('availability');
      expect(res.body).not.toHaveProperty('budget');
    });
  });

  describe('GET /api/join/:shareCode', () => {
    it('returns only the Viewer-safe trip details to a logged-in user', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const viewer = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);
      const storedTrip = await Trip.findById(trip.id);

      const res = await request(app())
        .get(`/api/join/${storedTrip.shareCode}`)
        .set('Cookie', viewer.cookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        name: 'Lisbon',
        organizerName: 'Test User',
        startDate: '2026-12-01',
        endDate: '2026-12-07',
        members: expect.arrayContaining([
          { name: 'Test User', role: 'organizer' },
          { name: 'Test User', role: 'member' },
        ]),
        viewerStatus: 'none',
      });
      expect(res.body.members).toHaveLength(2);
      expect(JSON.stringify(res.body)).not.toContain('email');
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('shareCode');
      expect(JSON.stringify(res.body)).not.toContain(trip.id);
      expect(JSON.stringify(res.body)).not.toContain(organizer.id);
      expect(JSON.stringify(res.body)).not.toContain(member.id);
    });

    it('returns 401 when the Viewer is logged out', async () => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);
      const storedTrip = await Trip.findById(trip.id);

      const res = await request(app()).get(`/api/join/${storedTrip.shareCode}`);

      expect(res.status).toBe(401);
    });

    it('returns a standard 404 error for an unknown share code', async () => {
      const viewer = await createUser();

      const res = await request(app())
        .get('/api/join/unknown-share-code')
        .set('Cookie', viewer.cookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toEqual({
        code: 'NOT_FOUND',
        message: expect.any(String),
      });
    });
  });

  describe('PATCH /api/trips/:tripId', () => {
    it('lets the Organizer edit the trip', async () => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .patch(`/api/trips/${trip.id}`)
        .set('Cookie', organizer.cookie)
        .send({ ...validTrip, name: 'Lisbon and Porto' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Lisbon and Porto');
    });

    it('returns 403 to a Member', async () => {
      const member = await createUser();
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      const res = await request(app())
        .patch(`/api/trips/${trip.id}`)
        .set('Cookie', member.cookie)
        .send(validTrip);

      expect(res.status).toBe(403);
    });

    it('rejects an end date before the start date', async () => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .patch(`/api/trips/${trip.id}`)
        .set('Cookie', organizer.cookie)
        .send({ ...validTrip, endDate: '2026-11-30' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/trips/:tripId', () => {
    it('lets the Organizer delete the trip and removes its memberships', async () => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);
      const member = await createUser();
      await addMember(trip.id, member.id);

      const res = await request(app())
        .delete(`/api/trips/${trip.id}`)
        .set('Cookie', organizer.cookie);

      expect(res.status).toBe(204);
      expect(await TripMembership.countDocuments({ trip: trip.id })).toBe(0);
    });

    it('returns 403 to a Member', async () => {
      const member = await createUser();
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      const res = await request(app()).delete(`/api/trips/${trip.id}`).set('Cookie', member.cookie);

      expect(res.status).toBe(403);
    });
  });
});
