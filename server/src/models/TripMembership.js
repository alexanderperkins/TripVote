import mongoose from 'mongoose';

const tripMembershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    role: { type: String, enum: ['organizer', 'member'], required: true },
    status: { type: String, enum: ['pending', 'active'], default: 'active', required: true },
  },
  { timestamps: true },
);

tripMembershipSchema.index({ user: 1, trip: 1 }, { unique: true });

export const TripMembership = mongoose.model('TripMembership', tripMembershipSchema);
