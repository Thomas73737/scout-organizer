import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true, enum: ["announcement", "post"] },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedId: { type: String, required: true },
  authorName: { type: String, default: null },
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
});

export const NotificationModel = mongoose.model("Notification", notificationSchema);

export type Notification = {
  _id?: mongoose.Types.ObjectId;
  id?: string;
  userId: string;
  type: "announcement" | "post";
  title: string;
  message: string;
  relatedId: string;
  authorName?: string | null;
  isRead: boolean;
  createdAt?: Date;
};

export type InsertNotification = Omit<Notification, "_id" | "createdAt">;
