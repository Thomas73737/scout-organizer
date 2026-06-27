import mongoose from "mongoose";
import { z } from "zod/v4";

export const accessRequestStatus = ["pending", "approved", "denied"] as const;

const accessRequestSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  team: { type: String, required: true },
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
  phone: string;
  team: string;
  status?: typeof accessRequestStatus[number];
  createdAt?: Date;
  updatedAt?: Date;
};

export type InsertAccessRequest = Omit<AccessRequest, "_id" | "createdAt" | "updatedAt" | "status"> & {
  status?: typeof accessRequestStatus[number];
};
