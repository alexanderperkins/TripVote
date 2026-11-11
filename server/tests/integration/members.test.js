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

async function createUser(name = 'Test User') {
  const credentials = {
    name,
    email: `member-test-${nextUserId++}@example.com`,
    password: 'correct-horse',
  };
  const register = await request(app()).post('/api/auth/register').send(credentials);
  const login = await request(app()).post('/api/auth/login').send(credentials);

  return { id: register.body.id, cookie: authCookie(login) };
}

async function createTrip(organizer) {
  const { body: trip } = await request(app())
    .post('/api/trips')
    .set('Cookie', organizer.cookie)
    .send(validTrip);
  const { shareCode } = await Trip.findById(trip.id);
  return { ...trip, shareCode };
}

const requestToJoin = (user, shareCode) =>
  request(app()).post(`/api/join/${shareCode}/requests`).set('Cookie', user.cookie);

const approve = (user, tripId, userId) =>
  request(app())
    .post(`/api/trips/${tripId}/join-requests/${userId}/approve`)
    .set('Cookie', user.cookie);

const deny = (user, tripId, userId) =>
  request(app()).delete(`/api/trips/${tripId}/join-requests/${userId}`).set('Cookie', user.cookie);

const removeMember = (user, tripId, userId) =>
  request(app()).delete(`/api/trips/${tripId}/members/${userId}`).set('Cookie', user.cookie);

const findMembership = (tripId, userId) => TripMembership.findOne({ trip: tripId, user: userId });

async function addActiveMember(trip, user) {
  await requestToJoin(user, trip.shareCode);
  await TripMembership.updateOne({ trip: trip.id, user: user.id }, { status: 'active' });
}

describe('join requests and members API', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(clearTestDb);

  describe('POST /api/join/:shareCode/requests', () => {
    it('creates a pending join request for a Viewer', async () => {
      const organizer = await createUser();
      const viewer = await createUser('Casey');
      const trip = await createTrip(organizer);

      const res = await requestToJoin(viewer, trip.shareCode);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ viewerStatus: 'pending' });
      const membership = await findMembership(trip.id, viewer.id);
      expect(membership).toMatchObject({ role: 'member', status: 'pending' });
    });

    it('does not give a pending requester access to the trip', async () => {
      const organizer = await createUser();
      const viewer = await createUser();
      const trip = await createTrip(organizer);
      await requestToJoin(viewer, trip.shareCode);

      const res = await request(app()).get(`/api/trips/${trip.id}`).set('Cookie', viewer.cookie);

      expect(res.status).toBe(403);
    });

    it('returns 409 when the user already asked to join', async () => {
      const organizer = await createUser();
      const viewer = await createUser();
      const trip = await createTrip(organizer);
      await requestToJoin(viewer, trip.shareCode);

      const res = await requestToJoin(viewer, trip.shareCode);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 409 when the user is already in the trip', async () => {
      const organizer = await createUser();
      const trip = await createTrip(organizer);

      const res = await requestToJoin(organizer, trip.shareCode);

      expect(res.status).toBe(409);
    });

    it('returns 404 for an unknown share code', async () => {
      const viewer = await createUser();

      const res = await requestToJoin(viewer, 'unknown-share-code');

      expect(res.status).toBe(404);
    });

    it('returns 401 when not logged in', async () => {
      const organizer = await createUser();
      const trip = await createTrip(organizer);

      const res = await request(app()).post(`/api/join/${trip.shareCode}/requests`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/join/:shareCode viewer status', () => {
    it('tells a Viewer whether they have a pending request', async () => {
      const organizer = await createUser();
      const viewer = await createUser();
      const trip = await createTrip(organizer);

      const before = await request(app())
        .get(`/api/join/${trip.shareCode}`)
        .set('Cookie', viewer.cookie);
      await requestToJoin(viewer, trip.shareCode);
      const after = await request(app())
        .get(`/api/join/${trip.shareCode}`)
        .set('Cookie', viewer.cookie);

      expect(before.body.viewerStatus).toBe('none');
      expect(after.body.viewerStatus).toBe('pending');
      expect(after.body).not.toHaveProperty('tripId');
    });

    it('gives an active Member the trip id so they can open it', async () => {
      const organizer = await createUser();
      const trip = await createTrip(organizer);

      const res = await request(app())
        .get(`/api/join/${trip.shareCode}`)
        .set('Cookie', organizer.cookie);

      expect(res.body).toMatchObject({ viewerStatus: 'member', tripId: trip.id });
    });

    it('does not list pending requesters as members', async () => {
      const organizer = await createUser('Jordan');
      const viewer = await createUser('Casey');
      const trip = await createTrip(organizer);
      await requestToJoin(viewer, trip.shareCode);

      const res = await request(app())
        .get(`/api/join/${trip.shareCode}`)
        .set('Cookie', viewer.cookie);

      expect(res.body.members).toEqual([{ name: 'Jordan', role: 'organizer' }]);
    });
  });

  describe('GET /api/trips/:tripId join requests', () => {
    it('shows pending requests to the Organizer', async () => {
      const organizer = await createUser('Jordan');
      const viewer = await createUser('Casey');
      const trip = await createTrip(organizer);
      await requestToJoin(viewer, trip.shareCode);

      const res = await request(app()).get(`/api/trips/${trip.id}`).set('Cookie', organizer.cookie);

      expect(res.body.joinRequests).toEqual([
        { userId: viewer.id, name: 'Casey', requestedAt: expect.any(String) },
      ]);
      expect(res.body.members).toHaveLength(1);
      expect(JSON.stringify(res.body.joinRequests)).not.toContain('email');
    });

    it('does not show join requests to a Member', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const viewer = await createUser();
      const trip = await createTrip(organizer);
      await addActiveMember(trip, member);
      await requestToJoin(viewer, trip.shareCode);

      const res = await request(app()).get(`/api/trips/${trip.id}`).set('Cookie', member.cookie);

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('joinRequests');
    });
  });

  describe('POST /api/trips/:tripId/join-requests/:userId/approve', () => {
    it('lets the Organizer approve a request so the requester becomes a Member', async () => {
      const organizer = await createUser();
      const viewer = await createUser('Casey');
      const trip = await createTrip(organizer);
      await requestToJoin(viewer, trip.shareCode);

      const res = await approve(organizer, trip.id, viewer.id);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ userId: viewer.id, name: 'Casey', role: 'member' });
      const tripRes = await request(app())
        .get(`/api/trips/${trip.id}`)
        .set('Cookie', viewer.cookie);
      expect(tripRes.status).toBe(200);
      expect(tripRes.body.role).toBe('member');
    });

    it('returns 403 to a Member', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const viewer = await createUser();
      const trip = await createTrip(organizer);
      await addActiveMember(trip, member);
      await requestToJoin(viewer, trip.shareCode);

      const res = await approve(member, trip.id, viewer.id);

      expect(res.status).toBe(403);
      expect((await findMembership(trip.id, viewer.id)).status).toBe('pending');
    });

    it('returns 403 to the requester themselves', async () => {
      const organizer = await createUser();
      const viewer = await createUser();
      const trip = await createTrip(organizer);
      await requestToJoin(viewer, trip.shareCode);

      const res = await approve(viewer, trip.id, viewer.id);

      expect(res.status).toBe(403);
    });

    it('returns 404 when there is no pending request for that user', async () => {
      const organizer = await createUser();
      const stranger = await createUser();
      const trip = await createTrip(organizer);

      const res = await approve(organizer, trip.id, stranger.id);

      expect(res.status).toBe(404);
    });

    it('returns 404 for a user id that is not valid', async () => {
      const organizer = await createUser();
      const trip = await createTrip(organizer);

      const res = await approve(organizer, trip.id, 'not-an-id');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/trips/:tripId/join-requests/:userId', () => {
    it('lets the Organizer deny a request', async () => {
      const organizer = await createUser();
      const viewer = await createUser();
      const trip = await createTrip(organizer);
      await requestToJoin(viewer, trip.shareCode);

      const res = await deny(organizer, trip.id, viewer.id);

      expect(res.status).toBe(204);
      expect(await findMembership(trip.id, viewer.id)).toBeNull();
    });

    it('does not remove an active Member', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const trip = await createTrip(organizer);
      await addActiveMember(trip, member);

      const res = await deny(organizer, trip.id, member.id);

      expect(res.status).toBe(404);
      expect(await findMembership(trip.id, member.id)).not.toBeNull();
    });

    it('returns 403 to a Member', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const viewer = await createUser();
      const trip = await createTrip(organizer);
      await addActiveMember(trip, member);
      await requestToJoin(viewer, trip.shareCode);

      const res = await deny(member, trip.id, viewer.id);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/trips/:tripId/members/:userId', () => {
    it('lets the Organizer remove a Member', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const trip = await createTrip(organizer);
      await addActiveMember(trip, member);

      const res = await removeMember(organizer, trip.id, member.id);

      expect(res.status).toBe(204);
      const tripRes = await request(app())
        .get(`/api/trips/${trip.id}`)
        .set('Cookie', member.cookie);
      expect(tripRes.status).toBe(403);
    });

    it('lets a Member leave the trip', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const trip = await createTrip(organizer);
      await addActiveMember(trip, member);

      const res = await removeMember(member, trip.id, member.id);

      expect(res.status).toBe(204);
      expect(await findMembership(trip.id, member.id)).toBeNull();
    });

    it('does not let a Member remove someone else', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const otherMember = await createUser();
      const trip = await createTrip(organizer);
      await addActiveMember(trip, member);
      await addActiveMember(trip, otherMember);

      const res = await removeMember(member, trip.id, otherMember.id);

      expect(res.status).toBe(403);
      expect(await findMembership(trip.id, otherMember.id)).not.toBeNull();
    });

    it('does not let the Organizer leave or be removed', async () => {
      const organizer = await createUser();
      const trip = await createTrip(organizer);

      const res = await removeMember(organizer, trip.id, organizer.id);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(await findMembership(trip.id, organizer.id)).not.toBeNull();
    });

    it('returns 404 when the user is not a Member', async () => {
      const organizer = await createUser();
      const stranger = await createUser();
      const trip = await createTrip(organizer);

      const res = await removeMember(organizer, trip.id, stranger.id);

      expect(res.status).toBe(404);
    });

    it('returns 403 to someone outside the trip', async () => {
      const organizer = await createUser();
      const member = await createUser();
      const stranger = await createUser();
      const trip = await createTrip(organizer);
      await addActiveMember(trip, member);

      const res = await removeMember(stranger, trip.id, member.id);

      expect(res.status).toBe(403);
    });

    it('returns 401 when not logged in', async () => {
      const organizer = await createUser();
      const trip = await createTrip(organizer);

      const res = await request(app()).delete(`/api/trips/${trip.id}/members/${organizer.id}`);

      expect(res.status).toBe(401);
    });
  });
});
