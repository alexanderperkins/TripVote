import { Vote } from '../models/Vote.js';
import { AppError } from './errors.js';

const DUPLICATE_KEY = 11000;

function emptySummary() {
  return { count: 0, voters: [], hasVoted: false };
}

// Returns a Map of activity id -> { count, voters, hasVoted } for the given viewer.
export async function voteSummaries(itemIds, viewerId) {
  const summaries = new Map(itemIds.map((id) => [id.toString(), emptySummary()]));
  if (itemIds.length === 0) return summaries;

  const votes = await Vote.find({ item: { $in: itemIds } })
    .sort({ createdAt: 1, _id: 1 })
    .populate({ path: 'user', select: 'name' });

  for (const vote of votes) {
    const summary = summaries.get(vote.item.toString());
    if (!summary || !vote.user) continue;
    const userId = vote.user._id.toString();
    summary.count += 1;
    summary.voters.push({ userId, name: vote.user.name });
    if (userId === viewerId) summary.hasVoted = true;
  }

  return summaries;
}

export async function addVote(tripId, itemId, userId) {
  try {
    await Vote.create({ trip: tripId, item: itemId, user: userId });
  } catch (error) {
    if (error.code === DUPLICATE_KEY) {
      throw new AppError(409, 'CONFLICT', 'You have already voted for this activity.');
    }
    throw error;
  }
}

export async function removeVote(itemId, userId) {
  const result = await Vote.deleteOne({ item: itemId, user: userId });
  if (result.deletedCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'You have not voted for this activity.');
  }
}

export async function removeVotesForItem(itemId) {
  await Vote.deleteMany({ item: itemId });
}
