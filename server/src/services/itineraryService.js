import mongoose from 'mongoose';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { AppError } from './errors.js';
import { addVote, removeVote, removeVotesForItem, voteSummaries } from './voteService.js';

function activityFields(item, user, votes = { count: 0, voters: [], hasVoted: false }) {
  const isPopulated = item.addedBy && typeof item.addedBy === 'object' && item.addedBy.name;
  const fields = {
    id: item._id.toString(),
    title: item.title,
    date: item.date,
    time: item.time,
    addedBy: {
      userId: user ? user.id : isPopulated ? item.addedBy._id.toString() : item.addedBy.toString(),
      name: user ? user.name : isPopulated ? item.addedBy.name : undefined,
    },
    votes,
  };

  if (item.location !== undefined && item.location !== null) {
    fields.location = item.location;
  }
  if (item.notes !== undefined && item.notes !== null) {
    fields.notes = item.notes;
  }

  return fields;
}

export async function createActivity(tripId, user, fields) {
  const item = await ItineraryItem.create({
    ...fields,
    trip: tripId,
    addedBy: user.id,
  });

  return activityFields(item, user);
}

export async function listActivities(tripId, viewerId) {
  const items = await ItineraryItem.find({ trip: tripId })
    .sort({ date: 1, time: 1, createdAt: 1 })
    .populate({ path: 'addedBy', select: 'name' });
  const votes = await voteSummaries(
    items.map((item) => item._id),
    viewerId,
  );

  return items.map((item) => activityFields(item, undefined, votes.get(item._id.toString())));
}

async function findActivity(tripId, activityId) {
  if (!mongoose.isValidObjectId(activityId)) {
    throw new AppError(404, 'NOT_FOUND', 'Activity not found.');
  }

  const item = await ItineraryItem.findOne({ _id: activityId, trip: tripId });
  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Activity not found.');
  }
  return item;
}

async function activityWithVotes(item, viewerId) {
  await item.populate({ path: 'addedBy', select: 'name' });
  const votes = await voteSummaries([item._id], viewerId);
  return activityFields(item, undefined, votes.get(item._id.toString()));
}

export async function updateActivity(tripId, activityId, user, role, fields) {
  const item = await findActivity(tripId, activityId);

  const isCreator = item.addedBy.toString() === user.id;
  const isOrganizer = role === 'organizer';
  if (!isCreator && !isOrganizer) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to edit this activity.');
  }

  Object.assign(item, fields);
  await item.save();

  return activityWithVotes(item, user.id);
}

export async function deleteActivity(tripId, activityId, user, role) {
  const item = await findActivity(tripId, activityId);

  const isCreator = item.addedBy.toString() === user.id;
  const isOrganizer = role === 'organizer';
  if (!isCreator && !isOrganizer) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this activity.');
  }

  await ItineraryItem.deleteOne({ _id: activityId });
  await removeVotesForItem(item._id);
}

export async function voteForActivity(tripId, activityId, user) {
  const item = await findActivity(tripId, activityId);
  await addVote(tripId, item._id, user.id);
  return activityWithVotes(item, user.id);
}

export async function removeVoteForActivity(tripId, activityId, user) {
  const item = await findActivity(tripId, activityId);
  await removeVote(item._id, user.id);
  return activityWithVotes(item, user.id);
}
