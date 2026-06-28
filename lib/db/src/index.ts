import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");
const envPath = path.join(projectRoot, ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import mongoose from "mongoose";
import {
  UserModel,
  SessionModel,
  ScoutProfileModel,
  AttendanceSessionModel,
  AttendanceRecordModel,
  AnnouncementModel,
  PostModel,
  AccessRequestModel,
} from "./schema";

// Use local MongoDB or provide a default for development
const databaseUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/scout-organizer';

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL not set, using default:", databaseUrl);
}

// Connect to MongoDB
export async function connectDB() {
  try {
    await mongoose.connect(databaseUrl);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

// Export schema models and types
export * from "./schema";

// Drizzle-like API compatibility layer
export const db = {
  select: () => ({
    from: (model: any) => ({
      where: (condition: any) => ({
        limit: () => Promise.resolve([]),
      }),
    }),
  }),
  insert: (model: any) => ({
    values: (data: any) => Promise.resolve({}),
  }),
  update: (model: any) => ({
    set: (data: any) => ({
      where: (condition: any) => Promise.resolve({}),
    }),
  }),
  delete: (model: any) => ({
    where: (condition: any) => Promise.resolve({}),
  }),
} as any;

// Export models as table-like references for backward compatibility
export const usersTable = UserModel;
export const sessionsTable = SessionModel;
export const scoutProfilesTable = ScoutProfileModel;
export const attendanceSessionsTable = AttendanceSessionModel;
export const attendanceRecordsTable = AttendanceRecordModel;
export const announcementsTable = AnnouncementModel;
export const postsTable = PostModel;
export const accessRequestsTable = AccessRequestModel;
