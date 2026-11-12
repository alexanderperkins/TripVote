import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'ItineraryItem', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// One vote per Member per activity.
voteSchema.index({ item: 1, user: 1 }, { unique: true });

export const Vote = mongoose.model('Vote', voteSchema);
