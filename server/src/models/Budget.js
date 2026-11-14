import mongoose from 'mongoose';

const budgetCategorySchema = new mongoose.Schema(
  {
    lodging: { type: Number, default: 0, min: 0 },
    food: { type: Number, default: 0, min: 0 },
    transport: { type: Number, default: 0, min: 0 },
    activities: { type: Number, default: 0, min: 0 },
    other: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const budgetSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      unique: true,
      index: true,
    },
    totalCents: { type: Number, required: true, min: 0 },
    categories: {
      type: budgetCategorySchema,
      default: () => ({ lodging: 0, food: 0, transport: 0, activities: 0, other: 0 }),
    },
  },
  { timestamps: true },
);

export const Budget = mongoose.model('Budget', budgetSchema);
