import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, scoutProfilesTable, announcementsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateAnnouncementBody } from "@workspace/api-zod";

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

router.get("/announcements", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const announcements = await db
    .select({
      id: announcementsTable.id,
      title: announcementsTable.title,
      content: announcementsTable.content,
      createdAt: announcementsTable.createdAt,
      authorName: sql<string>`concat(${usersTable.firstName}, ' ', ${usersTable.lastName})`,
      authorImageUrl: usersTable.profileImageUrl,
    })
    .from(announcementsTable)
    .innerJoin(usersTable, eq(usersTable.id, announcementsTable.authorUserId))
    .orderBy(sql`${announcementsTable.createdAt} desc`);

  res.json(announcements);
});

router.post("/announcements", async (req, res) => {
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

  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [announcement] = await db
    .insert(announcementsTable)
    .values({
      title: parsed.data.title,
      content: parsed.data.content,
      authorUserId: req.user.id,
    })
    .returning();

  const author = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, profileImageUrl: usersTable.profileImageUrl })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);

  res.status(201).json({
    ...announcement,
    authorName: author[0] ? `${author[0].firstName ?? ""} ${author[0].lastName ?? ""}`.trim() : null,
    authorImageUrl: author[0]?.profileImageUrl ?? null,
  });
});

router.delete("/announcements/:announcementId", async (req, res) => {
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

  const announcementId = parseInt(req.params.announcementId);
  if (isNaN(announcementId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(announcementsTable).where(eq(announcementsTable.id, announcementId));
  res.json({ success: true });
});

export default router;
