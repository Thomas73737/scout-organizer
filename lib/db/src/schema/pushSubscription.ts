import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  userAgent: String,
  createdAt: { type: Date, default: Date.now },
});

pushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

export const PushSubscriptionModel = mongoose.model("PushSubscription", pushSubscriptionSchema);

export type PushSubscription = {
  _id?: mongoose.Types.ObjectId;
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  createdAt?: Date;
};
