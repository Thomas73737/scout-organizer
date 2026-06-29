import mongoose from "mongoose";
import { z } from "zod/v4";

export const accessRequestStatus = ["pending", "approved", "denied"] as const;

const accessRequestSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  section: { type: String, required: true, enum: ["سنافر", "اشبال", "زهرات", "كشافة", "مرشدات"] },
  team: { type: String, required: true, enum: ["A", "B"] },
  isNewScout: { type: Boolean, required: true },
  whatsappNumber: { type: String },
  parentsWhatsappNumber: { type: String },
  homeAddress: { type: String },
  nationalId: { type: String },
  photoUrl: { type: String },
  parentNationalIdPhotoUrl: { type: String },
  patrol: { type: String, enum: ["صقر", "فهد", "ثعلب", "ذئب", "نمر", "نسر", "أسد", "غراب", "بلبل", "ديك", "خفاش", "غزال"] },
  status: { type: String, default: "pending", enum: accessRequestStatus },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const AccessRequestModel = mongoose.model("AccessRequest", accessRequestSchema);

// Types
export type AccessRequest = {
  _id?: mongoose.Types.ObjectId;
  id?: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  section: string;
  team: string;
  isNewScout: boolean;
  whatsappNumber?: string;
  parentsWhatsappNumber?: string;
  homeAddress?: string;
  nationalId?: string;
  photoUrl?: string;
  parentNationalIdPhotoUrl?: string;
  patrol?: string;
  status?: typeof accessRequestStatus[number];
  createdAt?: Date;
  updatedAt?: Date;
};

export type InsertAccessRequest = Omit<AccessRequest, "_id" | "createdAt" | "updatedAt" | "status"> & {
  status?: typeof accessRequestStatus[number];
};
