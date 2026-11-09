import { Trip } from '../models/Trip.js';
import { TripMembership } from '../models/TripMembership.js';
import { AppError } from './errors.js';
import { getViewerStatus, listJoinRequests } from './membershipService.js';

function tripFields(trip) {
  return {
    id: trip._id.toString(),
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
  };
}

export async function createTrip(userId, fields) {
  const trip = await Trip.create(fields);
  await TripMembership.create({ user: userId, trip: trip._id, role: 'organizer' });
  return { ...tripFields(trip), role: 'organizer' };
}

export async function listTrips(userId) {
  const memberships = await TripMembership.find({ user: userId, status: 'active' }).populate(
    'trip',
  );
  const trips = memberships.filter((membership) => membership.trip);

  return Promise.all(
    trips.map(async (membership) => ({
      ...tripFields(membership.trip),
      role: membership.role,
      memberCount: await TripMembership.countDocuments({
        trip: membership.trip._id,
        status: 'active',
      }),
    })),
  );
}

export async function getTrip(tripId, role) {
  const trip = await Trip.findById(tripId);
  const memberships = await TripMembership.find({ trip: tripId, status: 'active' }).populate({
    path: 'user',
    select: 'name',
  });

  const joinRequests = role === 'organizer' ? { joinRequests: await listJoinRequests(tripId) } : {};

  return {
    ...tripFields(trip),
    shareCode: trip.shareCode,
    role,
    ...joinRequests,
    members: memberships
      .filter((membership) => membership.user)
      .map((membership) => ({
        userId: membership.user._id.toString(),
        name: membership.user.name,
        role: membership.role,
      })),
  };
}

export async function getTripByShareCode(shareCode, userId) {
  const trip = await Trip.findOne({ shareCode });
  if (!trip) {
    throw new AppError(404, 'NOT_FOUND', 'This invite link is invalid.');
  }

  const memberships = await TripMembership.find({ trip: trip._id, status: 'active' }).populate({
    path: 'user',
    select: 'name',
  });
  const members = memberships
    .filter((membership) => membership.user)
    .map((membership) => ({ name: membership.user.name, role: membership.role }));
  const organizer = members.find((member) => member.role === 'organizer');
  const viewerStatus = await getViewerStatus(trip._id, userId);

  return {
    name: trip.name,
    organizerName: organizer?.name ?? '',
    startDate: trip.startDate,
    endDate: trip.endDate,
    members,
    viewerStatus,
    // Only someone already in the trip learns its id, so they can open it.
    ...(viewerStatus === 'member' && { tripId: trip._id.toString() }),
  };
}

export async function updateTrip(tripId, fields) {
  const trip = await Trip.findByIdAndUpdate(tripId, fields, {
    returnDocument: 'after',
    runValidators: true,
  });
  return tripFields(trip);
}

export async function deleteTrip(tripId) {
  await Trip.deleteOne({ _id: tripId });
  await TripMembership.deleteMany({ trip: tripId });
}
