import mongoose from 'mongoose';

// The days one Member says they are free for one trip (YYYY-MM-DD strings).
const availabilitySchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dates: { type: [String], default: [] },
  },
  { timestamps: true },
);

// One response per Member per trip.
availabilitySchema.index({ trip: 1, user: 1 }, { unique: true });

export const Availability = mongoose.model('Availability', availabilitySchema);
