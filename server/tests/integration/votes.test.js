import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
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
const validActivity = { title: 'Visit the aquarium', date: '2026-12-02', time: '10:30' };

let nextUserId = 0;

function authCookie(res) {
  return res.headers['set-cookie']?.find((cookie) => cookie.startsWith('token='));
}

async function createUser(name = 'Test User') {
  const credentials = {
    name,
    email: `votes-test-${nextUserId++}@example.com`,
    password: 'correct-horse',
  };
  const register = await request(app()).post('/api/auth/register').send(credentials);
  const login = await request(app()).post('/api/auth/login').send(credentials);

  return { id: register.body.id, name, cookie: authCookie(login) };
}

const addMember = (tripId, userId) =>
  TripMembership.create({ trip: tripId, user: userId, role: 'member', status: 'active' });

const itineraryPath = (tripId) => `/api/trips/${tripId}/itinerary`;
const votesPath = (tripId, activityId) => `${itineraryPath(tripId)}/${activityId}/votes`;

const vote = (user, tripId, activityId) =>
  request(app()).post(votesPath(tripId, activityId)).set('Cookie', user.cookie);

const unvote = (user, tripId, activityId) =>
  request(app()).delete(votesPath(tripId, activityId)).set('Cookie', user.cookie);

async function setUpTrip() {
  const organizer = await createUser('Ana Lopez');
  const member = await createUser('Sam Rivera');
  const trip = await request(app())
    .post('/api/trips')
    .set('Cookie', organizer.cookie)
    .send(validTrip);
  await addMember(trip.body.id, member.id);
  const activity = await request(app())
    .post(itineraryPath(trip.body.id))
    .set('Cookie', organizer.cookie)
    .send(validActivity);

  return { organizer, member, tripId: trip.body.id, activityId: activity.body.id };
}

describe('itinerary votes API', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(clearTestDb);

  it('starts a new activity with no votes', async () => {
    const { organizer, tripId } = await setUpTrip();

    const res = await request(app()).get(itineraryPath(tripId)).set('Cookie', organizer.cookie);

    expect(res.body[0].votes).toEqual({ count: 0, voters: [], hasVoted: false });
  });

  describe('POST /api/trips/:tripId/itinerary/:activityId/votes', () => {
    it('lets a Member vote and returns the activity with its vote count and voters', async () => {
      const { member, tripId, activityId } = await setUpTrip();

      const res = await vote(member, tripId, activityId);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: activityId,
        title: validActivity.title,
        votes: {
          count: 1,
          voters: [{ userId: member.id, name: 'Sam Rivera' }],
          hasVoted: true,
        },
      });
    });

    it('lets the Organizer vote', async () => {
      const { organizer, tripId, activityId } = await setUpTrip();

      const res = await vote(organizer, tripId, activityId);

      expect(res.status).toBe(201);
      expect(res.body.votes.count).toBe(1);
    });

    it('counts one vote from each Member and lists who voted in voting order', async () => {
      const { organizer, member, tripId, activityId } = await setUpTrip();
      await vote(member, tripId, activityId);
      await vote(organizer, tripId, activityId);

      const res = await request(app()).get(itineraryPath(tripId)).set('Cookie', member.cookie);

      expect(res.body[0].votes).toEqual({
        count: 2,
        voters: [
          { userId: member.id, name: 'Sam Rivera' },
          { userId: organizer.id, name: 'Ana Lopez' },
        ],
        hasVoted: true,
      });
    });

    it('shows hasVoted only for the Member who voted', async () => {
      const { organizer, member, tripId, activityId } = await setUpTrip();
      await vote(member, tripId, activityId);

      const res = await request(app()).get(itineraryPath(tripId)).set('Cookie', organizer.cookie);

      expect(res.body[0].votes).toMatchObject({ count: 1, hasVoted: false });
    });

    it('rejects a second vote from the same Member with 409', async () => {
      const { member, tripId, activityId } = await setUpTrip();
      await vote(member, tripId, activityId);

      const res = await vote(member, tripId, activityId);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      const list = await request(app()).get(itineraryPath(tripId)).set('Cookie', member.cookie);
      expect(list.body[0].votes.count).toBe(1);
    });

    it('returns 404 for an activity that does not exist', async () => {
      const { member, tripId } = await setUpTrip();

      const res = await vote(member, tripId, '64b7f0f0f0f0f0f0f0f0f0f0');

      expect(res.status).toBe(404);
    });

    it('returns 404 for an invalid activity id', async () => {
      const { member, tripId } = await setUpTrip();

      const res = await vote(member, tripId, 'not-an-id');

      expect(res.status).toBe(404);
    });

    it('returns 404 for an activity that belongs to another trip', async () => {
      const { organizer, activityId } = await setUpTrip();
      const otherTrip = await request(app())
        .post('/api/trips')
        .set('Cookie', organizer.cookie)
        .send(validTrip);

      const res = await vote(organizer, otherTrip.body.id, activityId);

      expect(res.status).toBe(404);
    });

    it('returns 403 to a non-member', async () => {
      const { tripId, activityId } = await setUpTrip();
      const outsider = await createUser('Outsider');

      const res = await vote(outsider, tripId, activityId);

      expect(res.status).toBe(403);
    });

    it('returns 401 when not logged in', async () => {
      const { tripId, activityId } = await setUpTrip();

      const res = await request(app()).post(votesPath(tripId, activityId));

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/trips/:tripId/itinerary/:activityId/votes', () => {
    it('removes the Member’s own vote and returns the updated activity', async () => {
      const { organizer, member, tripId, activityId } = await setUpTrip();
      await vote(member, tripId, activityId);
      await vote(organizer, tripId, activityId);

      const res = await unvote(member, tripId, activityId);

      expect(res.status).toBe(200);
      expect(res.body.votes).toEqual({
        count: 1,
        voters: [{ userId: organizer.id, name: 'Ana Lopez' }],
        hasVoted: false,
      });
    });

    it('lets the Member vote again after removing the vote', async () => {
      const { member, tripId, activityId } = await setUpTrip();
      await vote(member, tripId, activityId);
      await unvote(member, tripId, activityId);

      const res = await vote(member, tripId, activityId);

      expect(res.status).toBe(201);
      expect(res.body.votes.count).toBe(1);
    });

    it('returns 404 when the Member has not voted', async () => {
      const { member, tripId, activityId } = await setUpTrip();

      const res = await unvote(member, tripId, activityId);

      expect(res.status).toBe(404);
    });

    it('returns 403 to a non-member', async () => {
      const { member, tripId, activityId } = await setUpTrip();
      await vote(member, tripId, activityId);
      const outsider = await createUser('Outsider');

      const res = await unvote(outsider, tripId, activityId);

      expect(res.status).toBe(403);
    });

    it('returns 401 when not logged in', async () => {
      const { tripId, activityId } = await setUpTrip();

      const res = await request(app()).delete(votesPath(tripId, activityId));

      expect(res.status).toBe(401);
    });
  });

  it('removes an activity’s votes when the activity is deleted', async () => {
    const { organizer, member, tripId, activityId } = await setUpTrip();
    await vote(member, tripId, activityId);

    await request(app())
      .delete(`${itineraryPath(tripId)}/${activityId}`)
      .set('Cookie', organizer.cookie);

    expect(await mongoose.connection.collection('votes').countDocuments()).toBe(0);
  });
});
