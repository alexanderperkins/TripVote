import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Availability } from '../../src/models/Availability.js';
import { TripMembership } from '../../src/models/TripMembership.js';
import { startTestDb, clearTestDb, stopTestDb } from '../helpers/testDb.js';
import { createTestApp } from '../helpers/testApp.js';

const app = () => createTestApp();
const validTrip = {
  name: 'Lisbon',
  destination: 'Portugal',
  startDate: '2026-12-01',
  endDate: '2026-12-04',
};

let nextUserId = 0;

function authCookie(res) {
  return res.headers['set-cookie']?.find((cookie) => cookie.startsWith('token='));
}

async function createUser(name = 'Test User') {
  const credentials = {
    name,
    email: `availability-test-${nextUserId++}@example.com`,
    password: 'correct-horse',
  };
  const register = await request(app()).post('/api/auth/register').send(credentials);
  const login = await request(app()).post('/api/auth/login').send(credentials);

  return { id: register.body.id, name, cookie: authCookie(login) };
}

const availabilityPath = (tripId) => `/api/trips/${tripId}/availability`;

const getAvailability = (user, tripId) =>
  request(app()).get(availabilityPath(tripId)).set('Cookie', user.cookie);

const saveDates = (user, tripId, dates) =>
  request(app())
    .put(`${availabilityPath(tripId)}/me`)
    .set('Cookie', user.cookie)
    .send({ dates });

async function setUpTrip() {
  const organizer = await createUser('Ana Lopez');
  const member = await createUser('Sam Rivera');
  const trip = await request(app())
    .post('/api/trips')
    .set('Cookie', organizer.cookie)
    .send(validTrip);
  await TripMembership.create({
    trip: trip.body.id,
    user: member.id,
    role: 'member',
    status: 'active',
  });

  return { organizer, member, tripId: trip.body.id };
}

describe('availability API', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(clearTestDb);

  describe('GET /api/trips/:tripId/availability', () => {
    it('lists every trip day with nobody free and every Member waiting to respond', async () => {
      const { organizer, member, tripId } = await setUpTrip();

      const res = await getAvailability(organizer, tripId);

      expect(res.status).toBe(200);
      expect(res.body.days).toEqual([
        { date: '2026-12-01', count: 0, members: [] },
        { date: '2026-12-02', count: 0, members: [] },
        { date: '2026-12-03', count: 0, members: [] },
        { date: '2026-12-04', count: 0, members: [] },
      ]);
      expect(res.body.bestDates).toEqual([]);
      expect(res.body.responses).toEqual([]);
      expect(res.body.notResponded).toEqual([
        { userId: organizer.id, name: 'Ana Lopez' },
        { userId: member.id, name: 'Sam Rivera' },
      ]);
      expect(res.body.memberCount).toBe(2);
    });

    it('counts who is free each day and marks the days with the most overlap as best', async () => {
      const { organizer, member, tripId } = await setUpTrip();
      await saveDates(organizer, tripId, ['2026-12-02', '2026-12-03']);
      await saveDates(member, tripId, ['2026-12-03', '2026-12-04']);

      const res = await getAvailability(member, tripId);

      expect(res.body.days[2]).toEqual({
        date: '2026-12-03',
        count: 2,
        members: [
          { userId: organizer.id, name: 'Ana Lopez' },
          { userId: member.id, name: 'Sam Rivera' },
        ],
      });
      expect(res.body.days[0].count).toBe(0);
      expect(res.body.days[1].count).toBe(1);
      expect(res.body.bestDates).toEqual(['2026-12-03']);
      expect(res.body.notResponded).toEqual([]);
    });

    it('ignores saved dates that fall outside the trip after its dates change', async () => {
      const { organizer, tripId } = await setUpTrip();
      await saveDates(organizer, tripId, ['2026-12-01', '2026-12-04']);
      await request(app())
        .patch(`/api/trips/${tripId}`)
        .set('Cookie', organizer.cookie)
        .send({ ...validTrip, startDate: '2026-12-02' });

      const res = await getAvailability(organizer, tripId);

      expect(res.body.days.map((day) => day.date)).toEqual([
        '2026-12-02',
        '2026-12-03',
        '2026-12-04',
      ]);
      expect(res.body.responses).toEqual([
        { userId: organizer.id, name: 'Ana Lopez', dates: ['2026-12-04'] },
      ]);
    });

    it('leaves out people who are no longer active Members', async () => {
      const { organizer, member, tripId } = await setUpTrip();
      await saveDates(member, tripId, ['2026-12-02']);
      await request(app())
        .delete(`/api/trips/${tripId}/members/${member.id}`)
        .set('Cookie', organizer.cookie);

      const res = await getAvailability(organizer, tripId);

      expect(res.body.days[1].count).toBe(0);
      expect(res.body.memberCount).toBe(1);
      expect(await Availability.countDocuments({ trip: tripId, user: member.id })).toBe(0);
    });

    it('blocks a Viewer who is not a Member of the trip', async () => {
      const { tripId } = await setUpTrip();
      const viewer = await createUser('Viewer');

      const res = await getAvailability(viewer, tripId);

      expect(res.status).toBe(403);
      expect(res.body.days).toBeUndefined();
    });

    it('blocks someone whose join request is still pending', async () => {
      const { tripId } = await setUpTrip();
      const pending = await createUser('Pending');
      await TripMembership.create({
        trip: tripId,
        user: pending.id,
        role: 'member',
        status: 'pending',
      });

      const res = await getAvailability(pending, tripId);

      expect(res.status).toBe(403);
    });

    it('requires a session', async () => {
      const { tripId } = await setUpTrip();

      const res = await request(app()).get(availabilityPath(tripId));

      expect(res.status).toBe(401);
    });

    it('returns 404 for a malformed trip id', async () => {
      const { organizer } = await setUpTrip();

      const res = await getAvailability(organizer, 'not-an-id');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/trips/:tripId/availability/me', () => {
    it("saves the caller's free dates sorted and without duplicates", async () => {
      const { member, tripId } = await setUpTrip();

      const res = await saveDates(member, tripId, ['2026-12-03', '2026-12-01', '2026-12-03']);

      expect(res.status).toBe(200);
      expect(res.body.responses).toEqual([
        { userId: member.id, name: 'Sam Rivera', dates: ['2026-12-01', '2026-12-03'] },
      ]);
      expect(res.body.bestDates).toEqual(['2026-12-01', '2026-12-03']);
    });

    it('replaces earlier dates when the Member updates them', async () => {
      const { member, tripId } = await setUpTrip();
      await saveDates(member, tripId, ['2026-12-01', '2026-12-02']);

      const res = await saveDates(member, tripId, ['2026-12-04']);

      expect(res.body.responses[0].dates).toEqual(['2026-12-04']);
      expect(await Availability.countDocuments({ trip: tripId })).toBe(1);
    });

    it('counts a Member who clears every date as having responded', async () => {
      const { organizer, member, tripId } = await setUpTrip();
      await saveDates(member, tripId, ['2026-12-01']);

      const res = await saveDates(member, tripId, []);

      expect(res.status).toBe(200);
      expect(res.body.responses).toEqual([{ userId: member.id, name: 'Sam Rivera', dates: [] }]);
      expect(res.body.notResponded).toEqual([{ userId: organizer.id, name: 'Ana Lopez' }]);
    });

    it('rejects a date outside the trip range', async () => {
      const { member, tripId } = await setUpTrip();

      const res = await saveDates(member, tripId, ['2026-12-02', '2026-12-05']);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.dates).toBe('Pick dates between Dec 1 and Dec 4.');
      expect(await Availability.countDocuments({ trip: tripId })).toBe(0);
    });

    it.each([
      ['a missing list', {}],
      ['a non-date value', { dates: ['next tuesday'] }],
      ['a non-list value', { dates: '2026-12-01' }],
    ])('rejects %s', async (label, body) => {
      const { member, tripId } = await setUpTrip();

      const res = await request(app())
        .put(`${availabilityPath(tripId)}/me`)
        .set('Cookie', member.cookie)
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.dates).toBeDefined();
    });

    it('blocks a Viewer from saving dates', async () => {
      const { tripId } = await setUpTrip();
      const viewer = await createUser('Viewer');

      const res = await saveDates(viewer, tripId, ['2026-12-01']);

      expect(res.status).toBe(403);
      expect(await Availability.countDocuments({ trip: tripId })).toBe(0);
    });
  });

  it('removes saved availability when the trip is deleted', async () => {
    const { organizer, member, tripId } = await setUpTrip();
    await saveDates(member, tripId, ['2026-12-01']);

    await request(app()).delete(`/api/trips/${tripId}`).set('Cookie', organizer.cookie);

    expect(await Availability.countDocuments({ trip: tripId })).toBe(0);
  });
});
