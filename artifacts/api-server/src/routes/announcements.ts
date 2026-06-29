import { Router } from "express";
import { randomUUID } from "crypto";
import { AnnouncementModel, ScoutProfileModel, UserModel, NotificationModel } from "@workspace/db";
import { CreateAnnouncementBody } from "@workspace/api-zod";

const router = Router();

async function getProfile(userId: string) {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile;
}

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile?.role === "developer" || profile?.role === "leader";
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

router.get("/announcements", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const announcements = await AnnouncementModel.find()
    .sort({ createdAt: -1 })
    .lean();

  // Enrich with author information
  const enrichedAnnouncements = await Promise.all(
    announcements.map(async (announcement) => {
      const author = await UserModel.findOne({ id: announcement.authorUserId }).lean();
      return {
        ...announcement,
        authorName: author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : null,
        authorImageUrl: author?.profileImageUrl ?? null,
      };
    })
  );

  res.json(enrichedAnnouncements);
});

router.post("/announcements", async (req, res) => {
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

  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const announcement = await AnnouncementModel.create({
    id: randomUUID(),
    title: parsed.data.title,
    content: parsed.data.content,
    authorUserId: req.user.id,
  });

  const author = await UserModel.findOne({ id: req.user.id }).lean();
  const authorName = author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : "Someone";

  // Create notifications for all users except the author
  try {
    const allUsers = await UserModel.find({ id: { $ne: req.user.id } }).lean();
    const notifications = allUsers.map((user) => ({
      id: randomUUID(),
      userId: user.id,
      type: "announcement" as const,
      title: "New Announcement",
      message: parsed.data.title,
      relatedId: announcement.id,
      authorName,
      isRead: false,
    }));
    if (notifications.length > 0) {
      await NotificationModel.insertMany(notifications);
    }
  } catch (err) {
    console.error("Failed to create notifications:", err);
  }

  res.status(201).json({
    ...announcement.toObject(),
    authorName: author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : null,
    authorImageUrl: author?.profileImageUrl ?? null,
  });
});

router.delete("/announcements/:announcementId", async (req, res) => {
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

  const announcementId = req.params.announcementId;
  if (!announcementId) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await AnnouncementModel.deleteOne({ id: announcementId });
  res.json({ success: true });
});

export default router;
