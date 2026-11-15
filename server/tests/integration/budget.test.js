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

const validBudget = {
  totalCents: 100000,
  categories: {
    lodging: 40000,
    food: 30000,
    transport: 15000,
    activities: 10000,
    other: 5000,
  },
};

let nextUserId = 0;

function authCookie(res) {
  return res.headers['set-cookie']?.find((cookie) => cookie.startsWith('token='));
}

async function createUser(name = 'Test User') {
  const credentials = {
    name,
    email: `budget-test-${nextUserId++}@example.com`,
    password: 'correct-horse',
  };
  const register = await request(app()).post('/api/auth/register').send(credentials);
  const login = await request(app()).post('/api/auth/login').send(credentials);

  return { id: register.body.id, name, cookie: authCookie(login) };
}

const createTrip = (user, body = validTrip) =>
  request(app()).post('/api/trips').set('Cookie', user.cookie).send(body);

const addMember = (tripId, userId) =>
  TripMembership.create({ trip: tripId, user: userId, role: 'member', status: 'active' });

const budgetPath = (tripId) => `/api/trips/${tripId}/budget`;
const expensesPath = (tripId) => `/api/trips/${tripId}/expenses`;

describe('budget and expenses API', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(clearTestDb);

  describe('PUT /api/trips/:tripId/budget', () => {
    it('lets the Organizer set the total budget and category amounts', async () => {
      const organizer = await createUser('Organizer');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .put(budgetPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send(validBudget);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        totalCents: 100000,
      });
    });

    it('lets the Organizer set a budget when optional categories are omitted', async () => {
      const organizer = await createUser('Organizer');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .put(budgetPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({ totalCents: 50000 });

      expect(res.status).toBe(200);
      expect(res.body.totalCents).toBe(50000);
    });

    it('returns 403 to a Member', async () => {
      const organizer = await createUser('Organizer');
      const member = await createUser('Member');
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      const res = await request(app())
        .put(budgetPath(trip.id))
        .set('Cookie', member.cookie)
        .send(validBudget);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 to a non-member', async () => {
      const organizer = await createUser('Organizer');
      const stranger = await createUser('Stranger');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .put(budgetPath(trip.id))
        .set('Cookie', stranger.cookie)
        .send(validBudget);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 401 when not logged in', async () => {
      const organizer = await createUser('Organizer');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app()).put(budgetPath(trip.id)).send(validBudget);

      expect(res.status).toBe(401);
    });

    it.each([
      ['negative totalCents', { totalCents: -100 }],
      ['non-integer totalCents', { totalCents: 12.5 }],
      ['negative category amount', { totalCents: 1000, categories: { lodging: -50 } }],
      ['non-integer category amount', { totalCents: 1000, categories: { food: 25.5 } }],
    ])('rejects %s with 400 VALIDATION_ERROR', async (_label, invalidFields) => {
      const organizer = await createUser('Organizer');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .put(budgetPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send(invalidFields);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/trips/:tripId/expenses', () => {
    it('creates an expense and returns 201 to a Member', async () => {
      const organizer = await createUser('Organizer');
      const member = await createUser('Member');
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      const res = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', member.cookie)
        .send({
          description: 'Train tickets',
          amountCents: 4500,
          category: 'transport',
          paidBy: member.id,
          splitAmong: [organizer.id, member.id],
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        description: 'Train tickets',
        amountCents: 4500,
        category: 'transport',
        paidBy: { userId: member.id, name: 'Member' },
      });
    });

    it('creates an expense and returns 201 to the Organizer', async () => {
      const organizer = await createUser('Organizer');
      const member = await createUser('Member');
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      const res = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({
          description: 'Hotel deposit',
          amountCents: 20000,
          category: 'lodging',
          splitAmong: [organizer.id, member.id],
        });

      expect(res.status).toBe(201);
      expect(res.body.description).toBe('Hotel deposit');
    });

    it('defaults paidBy to the caller when omitted', async () => {
      const organizer = await createUser('Organizer');
      const member = await createUser('Member');
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      const res = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', member.cookie)
        .send({
          description: 'Dinner',
          amountCents: 6000,
          category: 'food',
          splitAmong: [organizer.id, member.id],
        });

      expect(res.status).toBe(201);
      expect(res.body.paidBy).toMatchObject({ userId: member.id, name: 'Member' });
    });

    it.each(['lodging', 'food', 'transport', 'activities', 'other'])(
      'accepts valid category "%s"',
      async (category) => {
        const organizer = await createUser('Organizer');
        const { body: trip } = await createTrip(organizer);

        const res = await request(app())
          .post(expensesPath(trip.id))
          .set('Cookie', organizer.cookie)
          .send({
            description: `Expense for ${category}`,
            amountCents: 1500,
            category,
            splitAmong: [organizer.id],
          });

        expect(res.status).toBe(201);
        expect(res.body.category).toBe(category);
      },
    );

    it('returns 403 to a non-member', async () => {
      const organizer = await createUser('Organizer');
      const stranger = await createUser('Stranger');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', stranger.cookie)
        .send({
          description: 'Snacks',
          amountCents: 500,
          category: 'food',
          splitAmong: [organizer.id],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 401 when not logged in', async () => {
      const organizer = await createUser('Organizer');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .post(expensesPath(trip.id))
        .send({
          description: 'Snacks',
          amountCents: 500,
          category: 'food',
          splitAmong: [organizer.id],
        });

      expect(res.status).toBe(401);
    });

    it.each([
      ['missing description', { amountCents: 1000, category: 'food' }],
      ['empty description', { description: '', amountCents: 1000, category: 'food' }],
      ['zero amountCents', { description: 'Snacks', amountCents: 0, category: 'food' }],
      ['negative amountCents', { description: 'Snacks', amountCents: -500, category: 'food' }],
      ['non-integer amountCents', { description: 'Snacks', amountCents: 12.5, category: 'food' }],
      ['invalid category', { description: 'Snacks', amountCents: 1000, category: 'flights' }],
      [
        'empty splitAmong',
        { description: 'Snacks', amountCents: 1000, category: 'food', splitAmong: [] },
      ],
    ])('rejects %s with 400 VALIDATION_ERROR', async (_label, invalidBody) => {
      const organizer = await createUser('Organizer');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({
          splitAmong: [organizer.id],
          ...invalidBody,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects paidBy when the user is not an active member of the trip', async () => {
      const organizer = await createUser('Organizer');
      const stranger = await createUser('Stranger');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({
          description: 'Lunch',
          amountCents: 2000,
          category: 'food',
          paidBy: stranger.id,
          splitAmong: [organizer.id],
        });

      expect(res.status).toBe(400);
    });

    it('rejects splitAmong containing a non-member id', async () => {
      const organizer = await createUser('Organizer');
      const stranger = await createUser('Stranger');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({
          description: 'Lunch',
          amountCents: 2000,
          category: 'food',
          splitAmong: [organizer.id, stranger.id],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/trips/:tripId/budget', () => {
    it('returns budget summary, category spending, balances, and expenses to a Member', async () => {
      const organizer = await createUser('Jordan');
      const member = await createUser('Casey');
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      await request(app())
        .put(budgetPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({
          totalCents: 100000,
          categories: { lodging: 50000, food: 30000 },
        });

      await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', member.cookie)
        .send({
          description: 'Hotel room',
          amountCents: 30000,
          category: 'lodging',
          splitAmong: [organizer.id, member.id],
        });

      await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({
          description: 'Groceries',
          amountCents: 10000,
          category: 'food',
          splitAmong: [organizer.id, member.id],
        });

      const res = await request(app()).get(budgetPath(trip.id)).set('Cookie', member.cookie);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        totalCents: 100000,
        spentCents: 40000,
        remainingCents: 60000,
        byCategory: expect.any(Array),
        balances: expect.any(Array),
        expenses: expect.any(Array),
      });
      expect(res.body.expenses).toHaveLength(2);
    });

    it('calculates overBudgetCents as 0 unless spent is over planned', async () => {
      const organizer = await createUser('Jordan');
      const { body: trip } = await createTrip(organizer);

      await request(app())
        .put(budgetPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({
          totalCents: 50000,
          categories: { lodging: 20000, food: 30000 },
        });

      // Lodging: planned 20000, spent 25000 -> overBudgetCents 5000
      await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({
          description: 'Fancy hotel',
          amountCents: 25000,
          category: 'lodging',
          splitAmong: [organizer.id],
        });

      // Food: planned 30000, spent 10000 -> overBudgetCents 0
      await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({
          description: 'Dinner',
          amountCents: 10000,
          category: 'food',
          splitAmong: [organizer.id],
        });

      const res = await request(app()).get(budgetPath(trip.id)).set('Cookie', organizer.cookie);

      expect(res.status).toBe(200);
      const lodging = res.body.byCategory.find((c) => c.category === 'lodging');
      const food = res.body.byCategory.find((c) => c.category === 'food');
      const transport = res.body.byCategory.find((c) => c.category === 'transport');

      expect(lodging).toMatchObject({
        plannedCents: 20000,
        spentCents: 25000,
        overBudgetCents: 5000,
      });
      expect(food).toMatchObject({
        plannedCents: 30000,
        spentCents: 10000,
        overBudgetCents: 0,
      });
      expect(transport).toMatchObject({
        plannedCents: 0,
        spentCents: 0,
        overBudgetCents: 0,
      });
    });

    it('returns names only and never exposes user emails', async () => {
      const organizer = await createUser('Jordan');
      const member = await createUser('Casey');
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', member.cookie)
        .send({
          description: 'Ferry ticket',
          amountCents: 1500,
          category: 'transport',
          splitAmong: [organizer.id, member.id],
        });

      const res = await request(app()).get(budgetPath(trip.id)).set('Cookie', member.cookie);

      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain('@example.com');
      res.body.balances.forEach((entry) => {
        expect(entry).toHaveProperty('name');
        expect(entry).not.toHaveProperty('email');
      });
    });

    it('returns 403 to a non-member', async () => {
      const organizer = await createUser('Organizer');
      const stranger = await createUser('Stranger');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app()).get(budgetPath(trip.id)).set('Cookie', stranger.cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 401 when not logged in', async () => {
      const organizer = await createUser('Organizer');
      const { body: trip } = await createTrip(organizer);

      const res = await request(app()).get(budgetPath(trip.id));

      expect(res.status).toBe(401);
    });
  });

  describe('Balances calculation', () => {
    it('splits 100 cents equally among 3 people giving shares of 34, 33, 33 and balances summing to 0', async () => {
      const userA = await createUser('Alice');
      const userB = await createUser('Bob');
      const userC = await createUser('Charlie');
      const { body: trip } = await createTrip(userA);
      await addMember(trip.id, userB.id);
      await addMember(trip.id, userC.id);

      // Alice pays 100 cents split among Alice, Bob, and Charlie
      await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', userA.cookie)
        .send({
          description: 'Snack pack',
          amountCents: 100,
          category: 'food',
          paidBy: userA.id,
          splitAmong: [userA.id, userB.id, userC.id],
        });

      const res = await request(app()).get(budgetPath(trip.id)).set('Cookie', userA.cookie);

      expect(res.status).toBe(200);
      const { balances } = res.body;

      // All balances sum to 0
      const totalBalance = balances.reduce((sum, b) => sum + b.balanceCents, 0);
      expect(totalBalance).toBe(0);

      const balA = balances.find((b) => b.userId === userA.id).balanceCents;
      const balB = balances.find((b) => b.userId === userB.id).balanceCents;
      const balC = balances.find((b) => b.userId === userC.id).balanceCents;

      // Shares are how much each person was allocated (100 - balance for payer, -balance for non-payers)
      const shares = [100 - balA, -balB, -balC].sort((x, y) => x - y);
      expect(shares).toEqual([33, 33, 34]);
    });
  });

  describe('DELETE /api/trips/:tripId/expenses/:expenseId', () => {
    it('lets the person who logged an expense delete it', async () => {
      const organizer = await createUser('Organizer');
      const member = await createUser('Member');
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      const { body: expense } = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', member.cookie)
        .send({
          description: 'Museum tickets',
          amountCents: 3000,
          category: 'activities',
          splitAmong: [organizer.id, member.id],
        });

      const res = await request(app())
        .delete(`${expensesPath(trip.id)}/${expense.id}`)
        .set('Cookie', member.cookie);

      expect(res.status).toBe(204);

      const budgetRes = await request(app()).get(budgetPath(trip.id)).set('Cookie', member.cookie);
      expect(budgetRes.body.spentCents).toBe(0);
      expect(budgetRes.body.expenses).toHaveLength(0);
    });

    it('lets the Organizer delete any expense', async () => {
      const organizer = await createUser('Organizer');
      const member = await createUser('Member');
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member.id);

      const { body: expense } = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', member.cookie)
        .send({
          description: 'Museum tickets',
          amountCents: 3000,
          category: 'activities',
          splitAmong: [organizer.id, member.id],
        });

      const res = await request(app())
        .delete(`${expensesPath(trip.id)}/${expense.id}`)
        .set('Cookie', organizer.cookie);

      expect(res.status).toBe(204);
    });

    it('returns 403 when another Member tries to delete the expense', async () => {
      const organizer = await createUser('Organizer');
      const member1 = await createUser('Member 1');
      const member2 = await createUser('Member 2');
      const { body: trip } = await createTrip(organizer);
      await addMember(trip.id, member1.id);
      await addMember(trip.id, member2.id);

      const { body: expense } = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', member1.cookie)
        .send({
          description: 'Boat tour',
          amountCents: 5000,
          category: 'activities',
          splitAmong: [organizer.id, member1.id, member2.id],
        });

      const res = await request(app())
        .delete(`${expensesPath(trip.id)}/${expense.id}`)
        .set('Cookie', member2.cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 to a non-member', async () => {
      const organizer = await createUser('Organizer');
      const stranger = await createUser('Stranger');
      const { body: trip } = await createTrip(organizer);

      const { body: expense } = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({
          description: 'Lunch',
          amountCents: 1500,
          category: 'food',
          splitAmong: [organizer.id],
        });

      const res = await request(app())
        .delete(`${expensesPath(trip.id)}/${expense.id}`)
        .set('Cookie', stranger.cookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 401 when not logged in', async () => {
      const organizer = await createUser('Organizer');
      const { body: trip } = await createTrip(organizer);

      const { body: expense } = await request(app())
        .post(expensesPath(trip.id))
        .set('Cookie', organizer.cookie)
        .send({
          description: 'Lunch',
          amountCents: 1500,
          category: 'food',
          splitAmong: [organizer.id],
        });

      const res = await request(app()).delete(`${expensesPath(trip.id)}/${expense.id}`);

      expect(res.status).toBe(401);
    });
  });
});
