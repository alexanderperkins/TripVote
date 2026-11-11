import mongoose from 'mongoose';
import { ItineraryItem } from '../models/ItineraryItem.js';
import { AppError } from './errors.js';

function activityFields(item, user) {
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

export async function listActivities(tripId) {
  const items = await ItineraryItem.find({ trip: tripId })
    .sort({ date: 1, time: 1, createdAt: 1 })
    .populate({ path: 'addedBy', select: 'name' });

  return items.map((item) => activityFields(item));
}

export async function updateActivity(tripId, activityId, user, role, fields) {
  if (!mongoose.isValidObjectId(activityId)) {
    throw new AppError(404, 'NOT_FOUND', 'Activity not found.');
  }

  const item = await ItineraryItem.findOne({ _id: activityId, trip: tripId });
  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Activity not found.');
  }

  const isCreator = item.addedBy.toString() === user.id;
  const isOrganizer = role === 'organizer';
  if (!isCreator && !isOrganizer) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to edit this activity.');
  }

  Object.assign(item, fields);
  await item.save();
  await item.populate({ path: 'addedBy', select: 'name' });

  return activityFields(item);
}

export async function deleteActivity(tripId, activityId, user, role) {
  if (!mongoose.isValidObjectId(activityId)) {
    throw new AppError(404, 'NOT_FOUND', 'Activity not found.');
  }

  const item = await ItineraryItem.findOne({ _id: activityId, trip: tripId });
  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Activity not found.');
  }

  const isCreator = item.addedBy.toString() === user.id;
  const isOrganizer = role === 'organizer';
  if (!isCreator && !isOrganizer) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this activity.');
  }

  await ItineraryItem.deleteOne({ _id: activityId });
}
