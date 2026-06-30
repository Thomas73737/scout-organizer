import mongoose from "mongoose";

const pointTransactionSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  userId: { type: String, required: true, index: true },
  points: { type: Number, required: true },
  reason: { type: String, required: true },
  awardedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

pointTransactionSchema.index({ userId: 1, createdAt: -1 });

export const PointTransactionModel = mongoose.model("PointTransaction", pointTransactionSchema);

export type PointTransaction = {
  _id?: mongoose.Types.ObjectId;
  id?: string;
  userId: string;
  points: number;
  reason: string;
  awardedBy: string;
  createdAt?: Date;
};

export type InsertPointTransaction = Omit<PointTransaction, "_id" | "createdAt">;
