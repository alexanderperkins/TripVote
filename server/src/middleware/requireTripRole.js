import mongoose from 'mongoose';
import { TripMembership } from '../models/TripMembership.js';
import { AppError } from '../services/errors.js';

export function requireTripRole(role) {
  return async (req, res, next) => {
    const { tripId } = req.params;
    if (!mongoose.isValidObjectId(tripId)) {
      throw new AppError(404, 'NOT_FOUND', 'Trip not found.');
    }

    const membership = await TripMembership.findOne({
      trip: tripId,
      user: req.user.id,
      status: 'active',
    });
    if (!membership || (role && membership.role !== role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this trip.');
    }

    req.membership = membership;
    next();
  };
}
