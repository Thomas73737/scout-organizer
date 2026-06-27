import mongoose from "mongoose";
import { z } from "zod/v4";

// Sessions schema
const sessionSchema = new mongoose.Schema({
  sid: { type: String, required: true, unique: true },
  sess: { type: mongoose.Schema.Types.Mixed, required: true },
  expire: { type: Date, required: true },
});

// Users schema
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  firstName: String,
  lastName: String,
  phone: String,
  team: String,
  profileImageUrl: String,
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
  firstName?: string;
  lastName?: string;
  phone?: string;
  team?: string;
  profileImageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UpsertUser = Omit<User, "_id" | "createdAt" | "updatedAt">;
