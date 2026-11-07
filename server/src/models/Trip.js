import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    shareCode: {
      type: String,
      required: true,
      unique: true,
      default: () => randomBytes(16).toString('hex'),
    },
  },
  { timestamps: true },
);

export const Trip = mongoose.model('Trip', tripSchema);
