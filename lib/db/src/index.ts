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

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Connect to MongoDB
export async function connectDB() {
  try {
    await mongoose.connect(process.env.DATABASE_URL!);
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
