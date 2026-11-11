import mongoose from 'mongoose';

const itineraryItemSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    location: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

itineraryItemSchema.index({ trip: 1, date: 1, time: 1 });

export const ItineraryItem = mongoose.model('ItineraryItem', itineraryItemSchema);
