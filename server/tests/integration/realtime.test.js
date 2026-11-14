import { createServer } from 'node:http';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { io as connectClient } from 'socket.io-client';
import { TripMembership } from '../../src/models/TripMembership.js';
import { attachRealtime } from '../../src/realtime/socketServer.js';
import { startTestDb, clearTestDb, stopTestDb } from '../helpers/testDb.js';
import { createTestApp } from '../helpers/testApp.js';

const validTrip = {
  name: 'Lisbon',
  destination: 'Portugal',
  startDate: '2026-12-01',
  endDate: '2026-12-07',
};
const validActivity = { title: 'Tram 28', date: '2026-12-02', time: '15:00' };
const EVENT_TIMEOUT_MS = 2000;

let app;
let httpServer;
let realtime;
let baseUrl;
let sockets = [];
let nextUserId = 0;

function authCookie(res) {
  return res.headers['set-cookie']?.find((cookie) => cookie.startsWith('token='));
}

async function createUser(name) {
  const credentials = {
    name,
    email: `realtime-test-${nextUserId++}@example.com`,
    password: 'correct-horse',
  };
  const register = await request(app).post('/api/auth/register').send(credentials);
  const login = await request(app).post('/api/auth/login').send(credentials);
  return { id: register.body.id, name, cookie: authCookie(login).split(';')[0] };
}

async function setUpTrip() {
  const organizer = await createUser('Ana Lopez');
  const member = await createUser('Sam Rivera');
  const trip = await request(app)
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

function connect(user) {
  const socket = connectClient(baseUrl, {
    transports: ['websocket'],
    reconnection: false,
    extraHeaders: user ? { Cookie: user.cookie } : {},
  });
  sockets.push(socket);
  return socket;
}

function waitFor(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No ${event} event`)), EVENT_TIMEOUT_MS);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function expectNoEvent(socket, event, ms = 300) {
  return new Promise((resolve, reject) => {
    const onEvent = () => reject(new Error(`Unexpected ${event} event`));
    socket.once(event, onEvent);
    setTimeout(() => {
      socket.off(event, onEvent);
      resolve();
    }, ms);
  });
}

async function joinTrip(user, tripId) {
  const socket = connect(user);
  await waitFor(socket, 'connect');
  const ack = await socket.timeout(EVENT_TIMEOUT_MS).emitWithAck('trip:join', tripId);
  return { socket, ack };
}

const itineraryPath = (tripId) => `/api/trips/${tripId}/itinerary`;

async function addActivity(user, tripId) {
  const res = await request(app)
    .post(itineraryPath(tripId))
    .set('Cookie', user.cookie)
    .send(validActivity);
  return res.body;
}

describe('live updates over Socket.IO', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);

  beforeEach(async () => {
    await clearTestDb();
    app = createTestApp();
    httpServer = createServer(app);
    realtime = attachRealtime(httpServer, app);
    await new Promise((resolve) => httpServer.listen(0, resolve));
    baseUrl = `http://localhost:${httpServer.address().port}`;
  });

  afterEach(async () => {
    sockets.forEach((socket) => socket.disconnect());
    sockets = [];
    await realtime.close();
  });

  it('refuses a connection without a valid session cookie', async () => {
    const socket = connect(null);

    const error = await waitFor(socket, 'connect_error');

    expect(error.message).toBe('UNAUTHENTICATED');
  });

  it('lets a Member join their trip', async () => {
    const { member, tripId } = await setUpTrip();

    const { ack } = await joinTrip(member, tripId);

    expect(ack).toEqual({ ok: true });
  });

  it('refuses to let a non-member join the trip', async () => {
    const { tripId } = await setUpTrip();
    const outsider = await createUser('Outsider');

    const { ack } = await joinTrip(outsider, tripId);

    expect(ack).toEqual({ ok: false, error: 'FORBIDDEN' });
  });

  it('refuses an invalid trip id', async () => {
    const { member } = await setUpTrip();

    const { ack } = await joinTrip(member, 'not-an-id');

    expect(ack).toEqual({ ok: false, error: 'FORBIDDEN' });
  });

  it('sends a new activity to other Members', async () => {
    const { organizer, member, tripId } = await setUpTrip();
    const { socket } = await joinTrip(organizer, tripId);

    const received = waitFor(socket, 'activity:created');
    await addActivity(member, tripId);

    expect(await received).toMatchObject({
      title: 'Tram 28',
      addedBy: { userId: member.id, name: 'Sam Rivera' },
      votes: { count: 0, voters: [] },
    });
  });

  it('sends an edited activity to other Members', async () => {
    const { organizer, member, tripId } = await setUpTrip();
    const activity = await addActivity(member, tripId);
    const { socket } = await joinTrip(organizer, tripId);

    const received = waitFor(socket, 'activity:updated');
    await request(app)
      .patch(`${itineraryPath(tripId)}/${activity.id}`)
      .set('Cookie', member.cookie)
      .send({ ...validActivity, title: 'Tram 28 to Graça' });

    expect(await received).toMatchObject({ id: activity.id, title: 'Tram 28 to Graça' });
  });

  it('sends a deleted activity id to other Members', async () => {
    const { organizer, member, tripId } = await setUpTrip();
    const activity = await addActivity(member, tripId);
    const { socket } = await joinTrip(organizer, tripId);

    const received = waitFor(socket, 'activity:deleted');
    await request(app)
      .delete(`${itineraryPath(tripId)}/${activity.id}`)
      .set('Cookie', member.cookie);

    expect(await received).toEqual({ id: activity.id });
  });

  it('sends vote changes to other Members without a per-viewer hasVoted flag', async () => {
    const { organizer, member, tripId } = await setUpTrip();
    const activity = await addActivity(organizer, tripId);
    const { socket } = await joinTrip(organizer, tripId);

    const voted = waitFor(socket, 'activity:votes');
    await request(app)
      .post(`${itineraryPath(tripId)}/${activity.id}/votes`)
      .set('Cookie', member.cookie);
    expect(await voted).toEqual({
      id: activity.id,
      votes: { count: 1, voters: [{ userId: member.id, name: 'Sam Rivera' }] },
    });

    const unvoted = waitFor(socket, 'activity:votes');
    await request(app)
      .delete(`${itineraryPath(tripId)}/${activity.id}/votes`)
      .set('Cookie', member.cookie);
    expect(await unvoted).toEqual({ id: activity.id, votes: { count: 0, voters: [] } });
  });

  it('does not send one trip’s changes to Members of another trip', async () => {
    const { member, tripId } = await setUpTrip();
    const other = await setUpTrip();
    const { socket } = await joinTrip(other.organizer, other.tripId);

    const nothing = expectNoEvent(socket, 'activity:created');
    await addActivity(member, tripId);

    await nothing;
  });

  it('stops sending changes to a Member after they are removed', async () => {
    const { organizer, member, tripId } = await setUpTrip();
    const { socket } = await joinTrip(member, tripId);

    await request(app)
      .delete(`/api/trips/${tripId}/members/${member.id}`)
      .set('Cookie', organizer.cookie);
    const nothing = expectNoEvent(socket, 'activity:created');
    await addActivity(organizer, tripId);

    await nothing;
  });
});
