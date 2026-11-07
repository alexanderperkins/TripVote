import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { TripMembership } from '../../src/models/TripMembership.js';
import { startTestDb, clearTestDb, stopTestDb, fakeAuth } from '../helpers/db.js';

const app = () => createApp({ requireAuth: fakeAuth });
const newId = () => new mongoose.Types.ObjectId().toString();
const validTrip = {
  name: 'Lisbon',
  destination: 'Portugal',
  startDate: '2026-12-01',
  endDate: '2026-12-07',
};

const createTrip = (userId, body = validTrip) =>
  request(app()).post('/api/trips').set('x-test-user', userId).send(body);

// Issue 6 will add a real join flow; until then, add a Member directly.
const addMember = (tripId, userId) =>
  TripMembership.create({ trip: tripId, user: userId, role: 'member', status: 'active' });

describe('trips API', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(clearTestDb);

  describe('POST /api/trips', () => {
    it('creates a trip and makes the creator the Organizer', async () => {
      const res = await createTrip(newId());

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ ...validTrip, role: 'organizer' });
      expect(res.body.id).toBeTruthy();
    });

    it('rejects an end date before the start date', async () => {
      const res = await createTrip(newId(), { ...validTrip, endDate: '2026-11-30' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('accepts an end date equal to the start date', async () => {
      const res = await createTrip(newId(), { ...validTrip, endDate: '2026-12-01' });

      expect(res.status).toBe(201);
    });

    it.each(['name', 'destination'])('rejects a missing %s', async (field) => {
      const body = { ...validTrip, [field]: '' };
      const res = await createTrip(newId(), body);

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
      const alex = newId();
      await createTrip(alex);
      await createTrip(newId(), { ...validTrip, name: 'Someone else' });

      const res = await request(app()).get('/api/trips').set('x-test-user', alex);

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
      const organizer = newId();
      const member = newId();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member);

      const res = await request(app()).get(`/api/trips/${trip.id}`).set('x-test-user', member);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Lisbon', role: 'member' });
      expect(res.body.members).toHaveLength(2);
    });

    it('returns 403 to someone who is not in the trip', async () => {
      const { body: trip } = await createTrip(newId());

      const res = await request(app()).get(`/api/trips/${trip.id}`).set('x-test-user', newId());

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 for an id that is not valid', async () => {
      const res = await request(app()).get('/api/trips/not-an-id').set('x-test-user', newId());

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/trips/:tripId', () => {
    it('lets the Organizer edit the trip', async () => {
      const organizer = newId();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .patch(`/api/trips/${trip.id}`)
        .set('x-test-user', organizer)
        .send({ ...validTrip, name: 'Lisbon and Porto' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Lisbon and Porto');
    });

    it('returns 403 to a Member', async () => {
      const member = newId();
      const { body: trip } = await createTrip(newId());
      await addMember(trip.id, member);

      const res = await request(app())
        .patch(`/api/trips/${trip.id}`)
        .set('x-test-user', member)
        .send(validTrip);

      expect(res.status).toBe(403);
    });

    it('rejects an end date before the start date', async () => {
      const organizer = newId();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .patch(`/api/trips/${trip.id}`)
        .set('x-test-user', organizer)
        .send({ ...validTrip, endDate: '2026-11-30' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/trips/:tripId', () => {
    it('lets the Organizer delete the trip and removes its memberships', async () => {
      const organizer = newId();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, newId());

      const res = await request(app())
        .delete(`/api/trips/${trip.id}`)
        .set('x-test-user', organizer);

      expect(res.status).toBe(204);
      expect(await TripMembership.countDocuments({ trip: trip.id })).toBe(0);
    });

    it('returns 403 to a Member', async () => {
      const member = newId();
      const { body: trip } = await createTrip(newId());
      await addMember(trip.id, member);

      const res = await request(app()).delete(`/api/trips/${trip.id}`).set('x-test-user', member);

      expect(res.status).toBe(403);
    });
  });
});
