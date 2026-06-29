import { Router } from "express";
import { randomUUID } from "crypto";
import { PostModel, ScoutProfileModel, UserModel, NotificationModel } from "@workspace/db";
import { CreatePostBody } from "@workspace/api-zod";

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

router.get("/posts", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const posts = await PostModel.find()
    .sort({ createdAt: -1 })
    .lean();

  // Enrich with author information
  const enrichedPosts = await Promise.all(
    posts.map(async (post) => {
      const author = await UserModel.findOne({ id: post.authorUserId }).lean();
      const profile = await ScoutProfileModel.findOne({ userId: post.authorUserId }).lean();
      return {
        ...post,
        authorId: profile?.id,
        authorName: author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : null,
        authorRole: profile?.role ?? "scout",
        authorImageUrl: author?.profileImageUrl ?? null,
      };
    })
  );

  res.json(enrichedPosts);
});

router.post("/posts", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const post = await PostModel.create({
    id: randomUUID(),
    content: parsed.data.content,
    fileUrl: parsed.data.fileUrl || null,
    fileName: parsed.data.fileName || null,
    fileType: parsed.data.fileType || null,
    authorUserId: req.user.id,
  });

  const author = await UserModel.findOne({ id: req.user.id }).lean();
  const authorName = author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : "Someone";
  const profile = await ScoutProfileModel.findOne({ userId: req.user.id }).lean();

  // Create notifications for all users except the author
  try {
    const allUsers = await UserModel.find({ id: { $ne: req.user.id } }).lean();
    const notifications = allUsers.map((user) => ({
      id: randomUUID(),
      userId: user.id,
      type: "post" as const,
      title: "New Community Post",
      message: parsed.data.content.length > 100 ? parsed.data.content.slice(0, 100) + "..." : parsed.data.content,
      relatedId: post.id,
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
    ...post.toObject(),
    authorId: profile?.id,
    authorName: author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : null,
    authorRole: profile?.role ?? "scout",
    authorImageUrl: author?.profileImageUrl ?? null,
  });
});

router.delete("/posts/:postId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const profile = await getProfile(req.user.id);

  const postId = req.params.postId;
  if (!postId) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const post = await PostModel.findOne({ id: postId });
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const isOwner = post.authorUserId === req.user.id;
  const hasElevatedPermissions = await isDeveloperOrLeader(req.user.id);

  if (!isOwner && !hasElevatedPermissions) {
    res.status(403).json({ error: "Not allowed" });
    return;
  }

  await PostModel.deleteOne({ id: postId });
  res.json({ success: true });
});

export default router;
