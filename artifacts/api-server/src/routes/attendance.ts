import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, scoutProfilesTable, attendanceSessionsTable, attendanceRecordsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { CreateAttendanceSessionBody, SubmitAttendanceRecordsBody } from "@workspace/api-zod";

const router = Router();

async function getProfile(userId: string) {
  const profile = await db
    .select({ role: scoutProfilesTable.role })
    .from(scoutProfilesTable)
    .where(eq(scoutProfilesTable.userId, userId))
    .limit(1);
  return profile[0] || null;
}

async function ensureProfile(userId: string) {
  const existing = await db.select().from(scoutProfilesTable).where(eq(scoutProfilesTable.userId, userId)).limit(1);
  if (existing.length === 0) {
    await db.insert(scoutProfilesTable).values({ userId, role: "scout" });
  }
}

router.get("/attendance/sessions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sessions = await db
    .select({
      id: attendanceSessionsTable.id,
      title: attendanceSessionsTable.title,
      sessionDate: attendanceSessionsTable.sessionDate,
      notes: attendanceSessionsTable.notes,
      createdAt: attendanceSessionsTable.createdAt,
      attendedCount: sql<number>`cast(count(case when ${attendanceRecordsTable.status} = 'present' then 1 end) as int)`,
      totalCount: sql<number>`cast(count(${attendanceRecordsTable.id}) as int)`,
    })
    .from(attendanceSessionsTable)
    .leftJoin(attendanceRecordsTable, eq(attendanceRecordsTable.sessionId, attendanceSessionsTable.id))
    .groupBy(attendanceSessionsTable.id)
    .orderBy(sql`${attendanceSessionsTable.sessionDate} desc`);

  res.json(sessions);
});

router.post("/attendance/sessions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const profile = await getProfile(req.user.id);
  if (!profile || profile.role !== "leader") {
    res.status(403).json({ error: "Leaders only" });
    return;
  }

  const parsed = CreateAttendanceSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [session] = await db
    .insert(attendanceSessionsTable)
    .values({
      title: parsed.data.title,
      sessionDate: new Date(parsed.data.sessionDate),
      notes: parsed.data.notes || null,
      createdByUserId: req.user.id,
    })
    .returning();

  res.status(201).json({ ...session, attendedCount: 0, totalCount: 0 });
});

router.get("/attendance/sessions/:sessionId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sessionId = parseInt(req.params.sessionId);
  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const sessions = await db
    .select()
    .from(attendanceSessionsTable)
    .where(eq(attendanceSessionsTable.id, sessionId))
    .limit(1);

  if (sessions.length === 0) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const records = await db
    .select({
      userId: scoutProfilesTable.id,
      scoutName: sql<string>`concat(${usersTable.firstName}, ' ', ${usersTable.lastName})`,
      profileImageUrl: usersTable.profileImageUrl,
      status: attendanceRecordsTable.status,
    })
    .from(attendanceRecordsTable)
    .innerJoin(usersTable, eq(usersTable.id, attendanceRecordsTable.userId))
    .innerJoin(scoutProfilesTable, eq(scoutProfilesTable.userId, usersTable.id))
    .where(eq(attendanceRecordsTable.sessionId, sessionId));

  res.json({ ...sessions[0], records });
});

router.post("/attendance/sessions/:sessionId/records", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const profile = await getProfile(req.user.id);
  if (!profile || profile.role !== "leader") {
    res.status(403).json({ error: "Leaders only" });
    return;
  }

  const sessionId = parseInt(req.params.sessionId);
  if (isNaN(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const parsed = SubmitAttendanceRecordsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  await db
    .delete(attendanceRecordsTable)
    .where(eq(attendanceRecordsTable.sessionId, sessionId));

  const allScouts = await db
    .select({ userId: usersTable.id })
    .from(usersTable)
    .innerJoin(scoutProfilesTable, eq(scoutProfilesTable.userId, usersTable.id));

  if (parsed.data.records.length > 0) {
    const recordsToInsert = parsed.data.records.map((r) => {
      const scout = allScouts.find((s) => s.userId === String(r.userId));
      return {
        sessionId,
        userId: scout ? scout.userId : String(r.userId),
        status: r.status as "present" | "absent",
      };
    });
    await db.insert(attendanceRecordsTable).values(recordsToInsert);
  }

  const sessions = await db
    .select()
    .from(attendanceSessionsTable)
    .where(eq(attendanceSessionsTable.id, sessionId))
    .limit(1);

  const records = await db
    .select({
      userId: scoutProfilesTable.id,
      scoutName: sql<string>`concat(${usersTable.firstName}, ' ', ${usersTable.lastName})`,
      profileImageUrl: usersTable.profileImageUrl,
      status: attendanceRecordsTable.status,
    })
    .from(attendanceRecordsTable)
    .innerJoin(usersTable, eq(usersTable.id, attendanceRecordsTable.userId))
    .innerJoin(scoutProfilesTable, eq(scoutProfilesTable.userId, usersTable.id))
    .where(eq(attendanceRecordsTable.sessionId, sessionId));

  res.json({ ...sessions[0], records });
});

router.get("/attendance/my-summary", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const totalSessions = await db.select({ count: count() }).from(attendanceSessionsTable);
  const myRecords = await db
    .select({ status: attendanceRecordsTable.status })
    .from(attendanceRecordsTable)
    .where(eq(attendanceRecordsTable.userId, req.user.id));

  const attended = myRecords.filter((r) => r.status === "present").length;
  const absent = myRecords.filter((r) => r.status === "absent").length;
  const total = Number(totalSessions[0]?.count ?? 0);

  res.json({
    totalSessions: total,
    attended,
    absent,
    rate: total > 0 ? Math.round((attended / total) * 100) : 0,
  });
});

export default router;
