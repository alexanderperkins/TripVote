import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
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
const validActivity = {
  title: 'Visit the aquarium',
  date: '2026-12-02',
  time: '10:30',
  location: 'Oceanário de Lisboa',
  notes: 'Book tickets in advance.',
};

let nextUserId = 0;

function authCookie(res) {
  return res.headers['set-cookie']?.find((cookie) => cookie.startsWith('token='));
}

async function createUser() {
  const credentials = {
    name: 'Test User',
    email: `itinerary-test-${nextUserId++}@example.com`,
    password: 'correct-horse',
  };
  const register = await request(app()).post('/api/auth/register').send(credentials);
  const login = await request(app()).post('/api/auth/login').send(credentials);

  return { id: register.body.id, cookie: authCookie(login) };
}

const createTrip = (user, body = validTrip) =>
  request(app()).post('/api/trips').set('Cookie', user.cookie).send(body);

const addMember = (tripId, userId) =>
  TripMembership.create({ trip: tripId, user: userId, role: 'member', status: 'active' });

const itineraryPath = (tripId) => `/api/trips/${tripId}/itinerary`;

async function createActivity(user, tripId, body = validActivity) {
  const res = await request(app())
    .post(itineraryPath(tripId))
    .set('Cookie', user.cookie)
    .send(body);

  expect(res.status).toBe(201);
  return res.body;
}

describe('itinerary API', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(clearTestDb);

  describe('POST /api/trips/:tripId/itinerary', () => {
    it('creates an activity with its creator details', async () => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .post(itineraryPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send(validActivity);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        ...validActivity,
        addedBy: { userId: organizer.id, name: 'Test User' },
      });
    });

    it('creates an activity when optional location and notes are omitted', async () => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);
      const activity = { ...validActivity };
      delete activity.location;
      delete activity.notes;

      const res = await request(app())
        .post(itineraryPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send(activity);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        ...activity,
        addedBy: { userId: organizer.id, name: 'Test User' },
      });
    });

    it.each(['title', 'date', 'time'])('rejects a missing %s', async (field) => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);
      const body = { ...validActivity };
      delete body[field];

      const res = await request(app())
        .post(itineraryPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it.each(['title', 'date', 'time'])('rejects an empty %s', async (field) => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .post(itineraryPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({ ...validActivity, [field]: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it.each([
      ['a non-ISO date', { date: '12/02/2026' }],
      ['an impossible date', { date: '2026-02-30' }],
      ['a time without a leading zero', { time: '9:30' }],
      ['an impossible time', { time: '24:00' }],
    ])('rejects %s', async (_label, invalidFields) => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .post(itineraryPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({ ...validActivity, ...invalidFields });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('allows a Member to add an activity', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      const activity = await createActivity(member, trip.id);

      expect(activity.addedBy).toMatchObject({ userId: member.id, name: 'Test User' });
    });

    it('returns 403 to a non-member', async () => {
      const organizer = await createUser();
      const someoneElse = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .post(itineraryPath(trip.id))
        .set('Cookie', someoneElse.cookie)
        .send(validActivity);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 401 when not logged in', async () => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app()).post(itineraryPath(trip.id)).send(validActivity);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/trips/:tripId/itinerary', () => {
    it('returns activities sorted by date and then time to a Member', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);
      await createActivity(member, trip.id, {
        ...validActivity,
        title: 'Later on the second day',
        date: '2026-12-02',
        time: '14:00',
      });
      await createActivity(organizer, trip.id, {
        ...validActivity,
        title: 'First day',
        date: '2026-12-01',
        time: '18:00',
      });
      await createActivity(member, trip.id, {
        ...validActivity,
        title: 'Earlier on the second day',
        date: '2026-12-02',
        time: '09:00',
      });

      const res = await request(app()).get(itineraryPath(trip.id)).set('Cookie', member.cookie);

      expect(res.status).toBe(200);
      expect(res.body.map(({ title }) => title)).toEqual([
        'First day',
        'Earlier on the second day',
        'Later on the second day',
      ]);
    });

    it('allows the Organizer to read the itinerary', async () => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app()).get(itineraryPath(trip.id)).set('Cookie', organizer.cookie);

      expect(res.status).toBe(200);
    });

    it('returns 403 to a non-member', async () => {
      const organizer = await createUser();
      const someoneElse = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .get(itineraryPath(trip.id))
        .set('Cookie', someoneElse.cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 401 when not logged in', async () => {
      const organizer = await createUser();
      const { body: trip } = await createTrip(organizer);

      const res = await request(app()).get(itineraryPath(trip.id));

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/trips/:tripId/itinerary/:activityId', () => {
    it('lets the person who added an activity edit it', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);
      const activity = await createActivity(member, trip.id);
      const updatedActivity = { ...validActivity, title: 'Visit the zoo' };

      const res = await request(app())
        .patch(`${itineraryPath(trip.id)}/${activity.id}`)
        .set('Cookie', member.cookie)
        .send(updatedActivity);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: activity.id, ...updatedActivity });
    });

    it('lets the Organizer edit any activity', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);
      const activity = await createActivity(member, trip.id);

      const res = await request(app())
        .patch(`${itineraryPath(trip.id)}/${activity.id}`)
        .set('Cookie', organizer.cookie)
        .send({ ...validActivity, title: 'Visit the zoo' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Visit the zoo');
    });

    it('returns 403 when another Member edits the activity', async () => {
      const organizer = await createUser();
      const creator = await createUser();
      const anotherMember = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, creator.id);
      await addMember(trip.id, anotherMember.id);
      const activity = await createActivity(creator, trip.id);

      const res = await request(app())
        .patch(`${itineraryPath(trip.id)}/${activity.id}`)
        .set('Cookie', anotherMember.cookie)
        .send({ ...validActivity, title: 'Visit the zoo' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/trips/:tripId/itinerary/:activityId', () => {
    it('lets the person who added an activity delete it', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);
      const activity = await createActivity(member, trip.id);

      const res = await request(app())
        .delete(`${itineraryPath(trip.id)}/${activity.id}`)
        .set('Cookie', member.cookie);

      expect(res.status).toBe(204);
    });

    it('lets the Organizer delete any activity', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);
      const activity = await createActivity(member, trip.id);

      const res = await request(app())
        .delete(`${itineraryPath(trip.id)}/${activity.id}`)
        .set('Cookie', organizer.cookie);

      expect(res.status).toBe(204);
    });

    it('returns 403 when another Member deletes the activity', async () => {
      const organizer = await createUser();
      const creator = await createUser();
      const anotherMember = await createUser();
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, creator.id);
      await addMember(trip.id, anotherMember.id);
      const activity = await createActivity(creator, trip.id);

      const res = await request(app())
        .delete(`${itineraryPath(trip.id)}/${activity.id}`)
        .set('Cookie', anotherMember.cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
