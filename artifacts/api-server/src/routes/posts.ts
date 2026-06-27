import { Router } from "express";
import { PostModel, ScoutProfileModel, UserModel } from "@workspace/db";
import { CreatePostBody } from "@workspace/api-zod";

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

router.get("/posts", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const posts = await db
    .select({
      id: postsTable.id,
      content: postsTable.content,
      fileUrl: postsTable.fileUrl,
      fileName: postsTable.fileName,
      fileType: postsTable.fileType,
      createdAt: postsTable.createdAt,
      authorId: scoutProfilesTable.id,
      authorName: sql<string>`concat(${usersTable.firstName}, ' ', ${usersTable.lastName})`,
      authorRole: scoutProfilesTable.role,
      authorImageUrl: usersTable.profileImageUrl,
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(usersTable.id, postsTable.authorUserId))
    .innerJoin(scoutProfilesTable, eq(scoutProfilesTable.userId, usersTable.id))
    .orderBy(sql`${postsTable.createdAt} desc`);

  res.json(posts);
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

  const [post] = await db
    .insert(postsTable)
    .values({
      content: parsed.data.content,
      fileUrl: parsed.data.fileUrl || null,
      fileName: parsed.data.fileName || null,
      fileType: parsed.data.fileType || null,
      authorUserId: req.user.id,
    })
    .returning();

  const author = await db
    .select({
      id: scoutProfilesTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
      role: scoutProfilesTable.role,
    })
    .from(usersTable)
    .innerJoin(scoutProfilesTable, eq(scoutProfilesTable.userId, usersTable.id))
    .where(eq(usersTable.id, req.user.id))
    .limit(1);

  res.status(201).json({
    ...post,
    authorId: author[0]?.id ?? 0,
    authorName: author[0] ? `${author[0].firstName ?? ""} ${author[0].lastName ?? ""}`.trim() : null,
    authorRole: author[0]?.role ?? "scout",
    authorImageUrl: author[0]?.profileImageUrl ?? null,
  });
});

router.delete("/posts/:postId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const profile = await getProfile(req.user.id);

  const postId = parseInt(req.params.postId);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const posts = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (posts.length === 0) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const post = posts[0];
  const isOwner = post.authorUserId === req.user.id;
  const isLeader = profile?.role === "leader";

  if (!isOwner && !isLeader) {
    res.status(403).json({ error: "Not allowed" });
    return;
  }

  await db.delete(postsTable).where(eq(postsTable.id, postId));
  res.json({ success: true });
});

export default router;
