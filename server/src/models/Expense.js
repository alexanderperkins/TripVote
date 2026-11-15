import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    description: { type: String, required: true, trim: true },
    amountCents: { type: Number, required: true, min: 1 },
    category: {
      type: String,
      enum: ['lodging', 'food', 'transport', 'activities', 'other'],
      required: true,
    },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    splitAmong: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

expenseSchema.index({ trip: 1, createdAt: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);
