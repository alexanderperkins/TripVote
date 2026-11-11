import mongoose from 'mongoose';
import { Trip } from '../models/Trip.js';
import { TripMembership } from '../models/TripMembership.js';
import { AppError } from './errors.js';

const VIEWER_STATUS = { pending: 'pending', active: 'member' };

function memberFields(membership) {
  return {
    userId: membership.user._id.toString(),
    name: membership.user.name,
    role: membership.role,
  };
}

function notFound(message) {
  return new AppError(404, 'NOT_FOUND', message);
}

async function findTripByShareCode(shareCode) {
  const trip = await Trip.findOne({ shareCode });
  if (!trip) throw notFound('This invite link is invalid.');
  return trip;
}

// The caller's relationship to the trip behind a share link: none, pending or member.
export async function getViewerStatus(tripId, userId) {
  const membership = await TripMembership.findOne({ trip: tripId, user: userId });
  return membership ? VIEWER_STATUS[membership.status] : 'none';
}

export async function requestToJoin(shareCode, userId) {
  const trip = await findTripByShareCode(shareCode);
  const existing = await TripMembership.findOne({ trip: trip._id, user: userId });
  if (existing) {
    const message =
      existing.status === 'pending'
        ? 'You have already asked to join this trip.'
        : 'You are already a member of this trip.';
    throw new AppError(409, 'CONFLICT', message);
  }

  try {
    await TripMembership.create({
      trip: trip._id,
      user: userId,
      role: 'member',
      status: 'pending',
    });
  } catch (error) {
    // Two requests at once: the unique (user, trip) index rejects the second one.
    if (error.code === 11000) {
      throw new AppError(409, 'CONFLICT', 'You have already asked to join this trip.');
    }
    throw error;
  }
  return { viewerStatus: 'pending' };
}

export async function listJoinRequests(tripId) {
  const requests = await TripMembership.find({ trip: tripId, status: 'pending' })
    .sort({ createdAt: 1 })
    .populate({ path: 'user', select: 'name' });

  return requests
    .filter((membership) => membership.user)
    .map((membership) => ({
      userId: membership.user._id.toString(),
      name: membership.user.name,
      requestedAt: membership.createdAt.toISOString(),
    }));
}

async function findMembership(tripId, userId, status, message) {
  if (!mongoose.isValidObjectId(userId)) throw notFound(message);
  const membership = await TripMembership.findOne({ trip: tripId, user: userId, status });
  if (!membership) throw notFound(message);
  return membership;
}

export async function approveJoinRequest(tripId, userId) {
  const membership = await findMembership(tripId, userId, 'pending', 'Join request not found.');
  membership.status = 'active';
  await membership.save();
  await membership.populate({ path: 'user', select: 'name' });
  return memberFields(membership);
}

export async function denyJoinRequest(tripId, userId) {
  const membership = await findMembership(tripId, userId, 'pending', 'Join request not found.');
  await membership.deleteOne();
}

// The Organizer can remove any Member; a Member can only remove themselves (leave).
export async function removeMember(tripId, userId, callerMembership) {
  const isSelf = callerMembership.user.toString() === userId;
  if (!isSelf && callerMembership.role !== 'organizer') {
    throw new AppError(403, 'FORBIDDEN', 'Only the Organizer can remove members.');
  }

  const membership = await findMembership(tripId, userId, 'active', 'Member not found.');
  if (membership.role === 'organizer') {
    throw new AppError(409, 'CONFLICT', 'The Organizer cannot leave or be removed from the trip.');
  }
  await membership.deleteOne();
}
