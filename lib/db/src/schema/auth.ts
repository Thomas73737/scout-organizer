import mongoose from "mongoose";
import { z } from "zod/v4";

export const userStatusEnum = ["pending", "approved", "denied", "banned"] as const;

// Sessions schema
const sessionSchema = new mongoose.Schema({
  sid: { type: String, required: true, unique: true },
  sess: { type: mongoose.Schema.Types.Mixed, required: true },
  expire: { type: Date, required: true },
});

// Users schema
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  phone: { type: String, required: true, unique: true },
  section: { type: String, required: true, enum: ["سنافر", "اشبال", "زهرات", "كشافة", "مرشدات"] },
  team: { type: String, required: true, enum: ["A", "B"] },
  profileImageUrl: String,
  whatsappNumber: String,
  parentsWhatsappNumber: String,
  homeAddress: String,
  patrol: { type: String, enum: ["صقر", "فهد", "ثعلب", "ذئب", "نمر", "نسر", "أسد", "غراب", "بلبل", "ديك", "خفاش", "غزال"] },
  status: { type: String, default: "pending", enum: userStatusEnum },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const SessionModel = mongoose.model("Session", sessionSchema);
export const UserModel = mongoose.model("User", userSchema);

// Types
export type User = {
  _id?: mongoose.Types.ObjectId;
  id?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  section?: string;
  team?: string;
  profileImageUrl?: string;
  whatsappNumber?: string;
  parentsWhatsappNumber?: string;
  homeAddress?: string;
  patrol?: string;
  status?: typeof userStatusEnum[number];
  createdAt?: Date;
  updatedAt?: Date;
};

export type UpsertUser = Omit<User, "_id" | "createdAt" | "updatedAt">;
