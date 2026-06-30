import { Router } from "express";
import { randomUUID } from "crypto";
import { AttendanceSessionModel, AttendanceRecordModel, ScoutProfileModel, UserModel } from "@workspace/db";
import { CreateAttendanceSessionBody, SubmitAttendanceRecordsBody } from "@workspace/api-zod";

const router = Router();

async function getProfile(userId: string) {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile;
}

async function ensureProfile(userId: string) {
  const existing = await ScoutProfileModel.findOne({ userId });
  if (!existing) {
    await ScoutProfileModel.create({
      id: randomUUID(),
      userId,
      role: "scout",
    });
  }
}

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile?.role === "developer" || profile?.role === "leader";
}

router.get("/attendance/sessions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sessions = await AttendanceSessionModel.find()
    .sort({ sessionDate: -1 })
    .lean();

  // Enrich with attendance counts
  const enrichedSessions = await Promise.all(
    sessions.map(async (session) => {
      const records = await AttendanceRecordModel.find({ sessionId: session.id });
      const attendedCount = records.filter(r => r.status === "present").length;
      const totalCount = records.length;
      const excusedCount = records.filter(r => r.status === "absent" && r.excuse === true).length;
      const withGearCount = records.filter(r => r.hasGear === true).length;
      
      return {
        ...session,
        attendedCount,
        totalCount,
        excusedCount,
        withGearCount,
      };
    })
  );

  res.json(enrichedSessions);
});

router.post("/attendance/sessions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const parsed = CreateAttendanceSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const session = await AttendanceSessionModel.create({
    id: randomUUID(),
    title: parsed.data.title,
    sessionDate: new Date(parsed.data.sessionDate),
    notes: parsed.data.notes || null,
    createdByUserId: req.user.id,
  });

  res.status(201).json({ ...session.toObject(), attendedCount: 0, totalCount: 0 });
});

router.get("/attendance/sessions/:sessionId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sessionId = req.params.sessionId;
  if (!sessionId) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const session = await AttendanceSessionModel.findOne({ id: sessionId });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const records = await AttendanceRecordModel.find({ sessionId }).lean();

  // Enrich with user information
  const enrichedRecords = await Promise.all(
    records.map(async (record) => {
      const user = await UserModel.findOne({ id: record.userId }).lean();
      const profile = await ScoutProfileModel.findOne({ userId: record.userId }).lean();
      return {
        userId: profile?.id,
        scoutName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : null,
        profileImageUrl: user?.profileImageUrl ?? null,
        status: record.status,
        excuse: record.excuse ?? false,
        hasGear: record.hasGear ?? false,
      };
    })
  );

  res.json({ ...session.toObject(), records: enrichedRecords });
});

router.post("/attendance/sessions/:sessionId/records", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const sessionId = req.params.sessionId;
  if (!sessionId) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const parsed = SubmitAttendanceRecordsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  // Delete existing records
  await AttendanceRecordModel.deleteMany({ sessionId });

  // Get all scouts
  const allProfiles = await ScoutProfileModel.find({ role: "scout" }).lean();
  const allUsers = await Promise.all(
    allProfiles.map(async (profile) => {
      const user = await UserModel.findOne({ id: profile.userId }).lean();
      return { ...profile, user };
    })
  );

  // Insert new records
  if (parsed.data.records.length > 0) {
    const recordsToInsert = parsed.data.records.map((r) => {
      // Find the scout by replitId (userId from frontend) or profile ID
      const scout = allUsers.find((s) => s.userId === r.userId || s.id === r.userId);
      return {
        id: randomUUID(),
        sessionId,
        userId: scout ? scout.userId : r.userId,
        status: r.status as "present" | "absent",
        excuse: r.excuse ?? false,
        hasGear: r.hasGear ?? false,
      };
    });
    await AttendanceRecordModel.insertMany(recordsToInsert);
  }

  // Get updated session and records
  const session = await AttendanceSessionModel.findOne({ id: sessionId });
  const records = await AttendanceRecordModel.find({ sessionId }).lean();

  // Enrich with user information
  const enrichedRecords = await Promise.all(
    records.map(async (record) => {
      const user = await UserModel.findOne({ id: record.userId }).lean();
      const profile = await ScoutProfileModel.findOne({ userId: record.userId }).lean();
      return {
        userId: profile?.id,
        scoutName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : null,
        profileImageUrl: user?.profileImageUrl ?? null,
        status: record.status,
        excuse: record.excuse ?? false,
        hasGear: record.hasGear ?? false,
      };
    })
  );

  res.json({ ...session?.toObject(), records: enrichedRecords });
});

router.delete("/attendance/sessions/:sessionId/records/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const { sessionId, userId } = req.params;
  if (!sessionId || !userId) {
    res.status(400).json({ error: "Invalid session ID or user ID" });
    return;
  }

  try {
    const result = await AttendanceRecordModel.deleteOne({ sessionId, userId });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Attendance record not found" });
      return;
    }
    res.json({ message: "Attendance record deleted successfully" });
  } catch (err: any) {
    console.error("Failed to delete attendance record:", err?.message ?? err);
    res.status(500).json({ error: "Failed to delete attendance record" });
  }
});

router.get("/attendance/my-summary", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const totalSessions = await AttendanceSessionModel.countDocuments();
  const myRecords = await AttendanceRecordModel.find({ userId: req.user.id });

  const attended = myRecords.filter((r) => r.status === "present").length;
  const absent = myRecords.filter((r) => r.status === "absent").length;
  const absentExcused = myRecords.filter((r) => r.status === "absent" && r.excuse === true).length;
  const absentUnexcused = myRecords.filter((r) => r.status === "absent" && (!r.excuse || r.excuse === false)).length;
  const withoutGear = myRecords.filter((r) => r.hasGear === false).length;
  const total = totalSessions;

  res.json({
    totalSessions: total,
    attended,
    absent,
    absentExcused,
    absentUnexcused,
    withoutGear,
    rate: total > 0 ? Math.round((attended / total) * 100) : 0,
  });
});

export default router;
