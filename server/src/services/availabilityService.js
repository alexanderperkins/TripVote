import { Availability } from '../models/Availability.js';
import { Trip } from '../models/Trip.js';
import { TripMembership } from '../models/TripMembership.js';
import { summarizeAvailability } from './availabilitySummary.js';
import { AppError } from './errors.js';

function shortDate(isoDate) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

async function findTrip(tripId) {
  const trip = await Trip.findById(tripId);
  if (!trip) throw new AppError(404, 'NOT_FOUND', 'Trip not found.');
  return trip;
}

async function activeMembers(tripId) {
  const memberships = await TripMembership.find({ trip: tripId, status: 'active' })
    .sort({ createdAt: 1, _id: 1 })
    .populate({ path: 'user', select: 'name' });

  return memberships
    .filter((membership) => membership.user)
    .map((membership) => ({ userId: membership.user._id.toString(), name: membership.user.name }));
}

async function summary(trip) {
  const [members, saved] = await Promise.all([
    activeMembers(trip._id),
    Availability.find({ trip: trip._id }).sort({ createdAt: 1, _id: 1 }),
  ]);
  const names = new Map(members.map((member) => [member.userId, member.name]));
  const responses = saved.map((record) => ({
    userId: record.user.toString(),
    name: names.get(record.user.toString()),
    dates: record.dates,
  }));

  return summarizeAvailability(trip, members, responses);
}

export async function getAvailability(tripId) {
  return summary(await findTrip(tripId));
}

// Replaces the caller's free dates for the trip. Every date must be inside the trip.
export async function setMyAvailability(tripId, userId, dates) {
  const trip = await findTrip(tripId);
  if (dates.some((date) => date < trip.startDate || date > trip.endDate)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Please fix the highlighted fields.', {
      dates: `Pick dates between ${shortDate(trip.startDate)} and ${shortDate(trip.endDate)}.`,
    });
  }

  await Availability.findOneAndUpdate(
    { trip: tripId, user: userId },
    { dates: [...new Set(dates)].sort() },
    { upsert: true, runValidators: true },
  );
  return summary(trip);
}

export async function removeAvailabilityForMember(tripId, userId) {
  await Availability.deleteOne({ trip: tripId, user: userId });
}

export async function removeAvailabilityForTrip(tripId) {
  await Availability.deleteMany({ trip: tripId });
}
