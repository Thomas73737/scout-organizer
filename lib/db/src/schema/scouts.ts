import mongoose from "mongoose";

export const roleEnum = ["scout", "leader", "developer"] as const;

const scoutProfileSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  userId: { type: String, required: true, unique: true },
  role: { type: String, default: "scout", enum: roleEnum },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const attendanceSessionSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  title: { type: String, required: true },
  sessionDate: { type: Date, required: true },
  notes: String,
  createdByUserId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const attendanceStatusEnum = ["present", "absent"] as const;

const attendanceRecordSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  sessionId: { type: String, required: true },
  userId: { type: String, required: true },
  status: { type: String, required: true, enum: attendanceStatusEnum },
  excuse: { type: Boolean, default: false },
  hasGear: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const announcementSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  authorUserId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  content: { type: String, required: true },
  fileUrl: String,
  fileName: String,
  fileType: String,
  authorUserId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ScoutProfileModel = mongoose.model("ScoutProfile", scoutProfileSchema);
export const AttendanceSessionModel = mongoose.model("AttendanceSession", attendanceSessionSchema);
export const AttendanceRecordModel = mongoose.model("AttendanceRecord", attendanceRecordSchema);
export const AnnouncementModel = mongoose.model("Announcement", announcementSchema);
export const PostModel = mongoose.model("Post", postSchema);

// Types
export type ScoutProfile = {
  _id?: mongoose.Types.ObjectId;
  id?: string;
  userId: string;
  role?: typeof roleEnum[number];
  createdAt?: Date;
  updatedAt?: Date;
};

export type InsertScoutProfile = Omit<ScoutProfile, "_id" | "createdAt" | "updatedAt">;

export type AttendanceSession = {
  _id?: mongoose.Types.ObjectId;
  id?: string;
  title: string;
  sessionDate: Date;
  notes?: string;
  createdByUserId: string;
  createdAt?: Date;
};

export type InsertAttendanceSession = Omit<AttendanceSession, "_id" | "createdAt">;

export type AttendanceRecord = {
  _id?: mongoose.Types.ObjectId;
  id?: string;
  sessionId: string;
  userId: string;
  status: typeof attendanceStatusEnum[number];
  excuse?: boolean;
  hasGear?: boolean;
  createdAt?: Date;
};

export type InsertAttendanceRecord = Omit<AttendanceRecord, "_id" | "createdAt">;

export type Announcement = {
  _id?: mongoose.Types.ObjectId;
  id?: string;
  title: string;
  content: string;
  authorUserId: string;
  createdAt?: Date;
};

export type InsertAnnouncement = Omit<Announcement, "_id" | "createdAt">;

export type Post = {
  _id?: mongoose.Types.ObjectId;
  id?: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  authorUserId: string;
  createdAt?: Date;
};

export type InsertPost = Omit<Post, "_id" | "createdAt">;
