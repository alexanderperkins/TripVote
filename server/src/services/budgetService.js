import mongoose from 'mongoose';
import { Budget } from '../models/Budget.js';
import { Expense } from '../models/Expense.js';
import { TripMembership } from '../models/TripMembership.js';
import { AppError } from './errors.js';

const CATEGORIES = ['lodging', 'food', 'transport', 'activities', 'other'];

function formatExpense(exp, nameLookup) {
  const payerId = (exp.paidBy._id || exp.paidBy).toString();
  const payerName = exp.paidBy.name || nameLookup?.get(payerId) || '';

  const splitAmong = exp.splitAmong.map((u) => {
    const userId = (u._id || u).toString();
    const name = u.name || nameLookup?.get(userId) || '';
    return { userId, name };
  });

  return {
    id: exp._id.toString(),
    description: exp.description,
    amountCents: exp.amountCents,
    category: exp.category,
    paidBy: {
      userId: payerId,
      name: payerName,
    },
    splitAmong,
    createdAt: exp.createdAt?.toISOString(),
  };
}

export async function setBudget(tripId, fields) {
  const categories = {
    lodging: fields.categories?.lodging ?? 0,
    food: fields.categories?.food ?? 0,
    transport: fields.categories?.transport ?? 0,
    activities: fields.categories?.activities ?? 0,
    other: fields.categories?.other ?? 0,
  };

  const budget = await Budget.findOneAndUpdate(
    { trip: tripId },
    {
      trip: tripId,
      totalCents: fields.totalCents,
      categories,
    },
    { returnDocument: 'after', upsert: true, runValidators: true },
  );

  return {
    totalCents: budget.totalCents,
    categories: {
      lodging: budget.categories.lodging,
      food: budget.categories.food,
      transport: budget.categories.transport,
      activities: budget.categories.activities,
      other: budget.categories.other,
    },
  };
}

export async function createExpense(tripId, user, fields) {
  const payerId = fields.paidBy || user.id;

  const activeMemberships = await TripMembership.find({
    trip: tripId,
    status: 'active',
  }).populate('user', 'name');

  const memberMap = new Map();
  for (const m of activeMemberships) {
    memberMap.set(m.user._id.toString(), m.user.name);
  }

  if (!memberMap.has(payerId.toString())) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Paid by user must be an active member of the trip.',
    );
  }

  for (const splitId of fields.splitAmong) {
    if (!memberMap.has(splitId.toString())) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'All split members must be active members of the trip.',
      );
    }
  }

  const expense = await Expense.create({
    trip: tripId,
    description: fields.description,
    amountCents: fields.amountCents,
    category: fields.category,
    paidBy: payerId,
    splitAmong: fields.splitAmong,
    createdBy: user.id,
  });

  return {
    id: expense._id.toString(),
    description: expense.description,
    amountCents: expense.amountCents,
    category: expense.category,
    paidBy: {
      userId: payerId.toString(),
      name: memberMap.get(payerId.toString()),
    },
    splitAmong: fields.splitAmong.map((id) => ({
      userId: id.toString(),
      name: memberMap.get(id.toString()),
    })),
    createdAt: expense.createdAt?.toISOString(),
  };
}

export async function getBudgetSummary(tripId) {
  const budget = await Budget.findOne({ trip: tripId });
  const totalCents = budget ? budget.totalCents : 0;
  const plannedCategories = budget?.categories || {};

  const activeMemberships = await TripMembership.find({
    trip: tripId,
    status: 'active',
  }).populate('user', 'name');

  const memberBalances = new Map();
  for (const m of activeMemberships) {
    memberBalances.set(m.user._id.toString(), {
      name: m.user.name,
      balanceCents: 0,
    });
  }

  const expenses = await Expense.find({ trip: tripId })
    .sort({ createdAt: -1 })
    .populate([
      { path: 'paidBy', select: 'name' },
      { path: 'splitAmong', select: 'name' },
    ]);

  let spentCents = 0;
  const categorySpent = { lodging: 0, food: 0, transport: 0, activities: 0, other: 0 };

  for (const exp of expenses) {
    spentCents += exp.amountCents;
    categorySpent[exp.category] = (categorySpent[exp.category] || 0) + exp.amountCents;

    const payerId = (exp.paidBy._id || exp.paidBy).toString();
    if (memberBalances.has(payerId)) {
      memberBalances.get(payerId).balanceCents += exp.amountCents;
    }

    const splitCount = exp.splitAmong.length;
    if (splitCount > 0) {
      const baseShare = Math.floor(exp.amountCents / splitCount);
      const remainder = exp.amountCents % splitCount;

      for (let i = 0; i < splitCount; i++) {
        const splitId = (exp.splitAmong[i]._id || exp.splitAmong[i]).toString();
        const share = baseShare + (i < remainder ? 1 : 0);
        if (memberBalances.has(splitId)) {
          memberBalances.get(splitId).balanceCents -= share;
        }
      }
    }
  }

  const remainingCents = totalCents - spentCents;

  const byCategory = CATEGORIES.map((category) => {
    const plannedCents = plannedCategories[category] ?? 0;
    const spent = categorySpent[category] ?? 0;
    const overBudgetCents = Math.max(0, spent - plannedCents);
    return {
      category,
      plannedCents,
      spentCents: spent,
      overBudgetCents,
    };
  });

  const balances = Array.from(memberBalances.entries()).map(([userId, info]) => ({
    userId,
    name: info.name,
    balanceCents: info.balanceCents,
  }));

  const nameLookup = new Map();
  for (const [id, info] of memberBalances.entries()) {
    nameLookup.set(id, info.name);
  }

  const formattedExpenses = expenses.map((exp) => formatExpense(exp, nameLookup));

  return {
    totalCents,
    spentCents,
    remainingCents,
    byCategory,
    balances,
    expenses: formattedExpenses,
  };
}

export async function deleteExpense(tripId, expenseId, user, role) {
  if (!mongoose.isValidObjectId(expenseId)) {
    throw new AppError(404, 'NOT_FOUND', 'Expense not found.');
  }

  const expense = await Expense.findOne({ _id: expenseId, trip: tripId });
  if (!expense) {
    throw new AppError(404, 'NOT_FOUND', 'Expense not found.');
  }

  const isCreator = expense.createdBy.toString() === user.id;
  const isOrganizer = role === 'organizer';
  if (!isCreator && !isOrganizer) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this expense.');
  }

  await Expense.deleteOne({ _id: expenseId });
}
