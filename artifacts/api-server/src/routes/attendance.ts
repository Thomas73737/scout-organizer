import { Router } from "express";
import { randomUUID } from "crypto";
import { supabase } from "@workspace/db";
import { CreateAttendanceSessionBody, SubmitAttendanceRecordsBody } from "@workspace/api-zod";

const router = Router();

async function getProfile(userId: string) {
  const { data } = await supabase
    .from("scout_profiles")
    .select("*")
    .eq("userId", userId)
    .single();
  return data;
}

async function ensureProfile(userId: string) {
  const { data: existing } = await supabase
    .from("scout_profiles")
    .select("id")
    .eq("userId", userId)
    .single();
  if (!existing) {
    await supabase.from("scout_profiles").insert({
      id: randomUUID(),
      userId,
      role: "scout",
    });
  }
}

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("scout_profiles")
    .select("role")
    .eq("userId", userId)
    .single();
  return data?.role === "developer" || data?.role === "leader";
}

router.get("/attendance/sessions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .select("*")
    .order("sessionDate", { ascending: false });

  if (!sessions) {
    res.json([]);
    return;
  }

  // Enrich with attendance counts
  const enrichedSessions = await Promise.all(
    sessions.map(async (session) => {
      const { data: records } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("sessionId", session.id);
      
      const allRecords = records || [];
      const attendedCount = allRecords.filter(r => r.status === "present").length;
      const totalCount = allRecords.length;
      const excusedCount = allRecords.filter(r => r.status === "absent" && r.excuse === true).length;
      const withGearCount = allRecords.filter(r => r.hasGear === true).length;
      
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

  const newId = randomUUID();
  const sessionData = {
    id: newId,
    title: parsed.data.title,
    sessionDate: new Date(parsed.data.sessionDate).toISOString(),
    notes: parsed.data.notes || null,
    createdByUserId: req.user.id,
  };

  await supabase.from("attendance_sessions").insert(sessionData);

  res.status(201).json({ ...sessionData, attendedCount: 0, totalCount: 0 });
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

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { data: records } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("sessionId", sessionId);

  // Enrich with user information
  const enrichedRecords = await Promise.all(
    (records || []).map(async (record) => {
      const { data: user } = await supabase
        .from("users")
        .select("firstName, lastName, profileImageUrl")
        .eq("id", record.userId)
        .single();
      return {
        userId: record.userId,
        scoutName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : null,
        profileImageUrl: user?.profileImageUrl ?? null,
        status: record.status,
        excuse: record.excuse ?? false,
        hasGear: record.hasGear ?? false,
      };
    })
  );

  res.json({ ...session, records: enrichedRecords });
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
  await supabase.from("attendance_records").delete().eq("sessionId", sessionId);

  // Get all scouts, CPs, and CP of CPs
  const { data: allProfiles } = await supabase
    .from("scout_profiles")
    .select("*")
    .in("role", ["scout", "cp", "cp_of_cps"]);

  const allUsers = await Promise.all(
    (allProfiles || []).map(async (profile) => {
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", profile.userId)
        .single();
      return { ...profile, user };
    })
  );

  // Insert new records
  if (parsed.data.records.length > 0) {
    const recordsToInsert = parsed.data.records.map((r) => {
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
    await supabase.from("attendance_records").insert(recordsToInsert);
  }

  // Get updated session and records
  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  const { data: records } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("sessionId", sessionId);

  // Enrich with user information
  const enrichedRecords = await Promise.all(
    (records || []).map(async (record) => {
      const { data: user } = await supabase
        .from("users")
        .select("firstName, lastName, profileImageUrl")
        .eq("id", record.userId)
        .single();
      return {
        userId: record.userId,
        scoutName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : null,
        profileImageUrl: user?.profileImageUrl ?? null,
        status: record.status,
        excuse: record.excuse ?? false,
        hasGear: record.hasGear ?? false,
      };
    })
  );

  res.json({ ...session, records: enrichedRecords });
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
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("sessionId", sessionId)
      .eq("userId", userId)
      .maybeSingle();

    if (!existingRecord) {
      res.status(404).json({ error: "Attendance record not found" });
      return;
    }

    await supabase
      .from("attendance_records")
      .delete()
      .eq("sessionId", sessionId)
      .eq("userId", userId);

    res.json({ message: "Attendance record deleted successfully" });
  } catch (err: any) {
    console.error("Failed to delete attendance record:", err?.message ?? err);
    res.status(500).json({ error: "Failed to delete attendance record" });
  }
});

router.delete("/attendance/sessions/:sessionId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Leaders and developers only" });
    return;
  }

  const { sessionId } = req.params;
  if (!sessionId) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("id")
    .eq("id", sessionId)
    .single();
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  try {
    await supabase.from("attendance_records").delete().eq("sessionId", sessionId);
    await supabase.from("attendance_sessions").delete().eq("id", sessionId);
    res.json({ message: "Attendance session deleted successfully" });
  } catch (err: any) {
    console.error("Failed to delete attendance session:", err?.message ?? err);
    res.status(500).json({ error: "Failed to delete attendance session" });
  }
});

router.get("/attendance/my-summary", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { count: totalSessions } = await supabase
    .from("attendance_sessions")
    .select("id", { count: "exact", head: true });

  const { data: myRecords } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("userId", req.user.id);

  const records = myRecords || [];
  const attended = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const absentExcused = records.filter((r) => r.status === "absent" && r.excuse === true).length;
  const absentUnexcused = records.filter((r) => r.status === "absent" && (!r.excuse || r.excuse === false)).length;
  const withoutGear = records.filter((r) => r.hasGear === false).length;
  const total = totalSessions || 0;

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
