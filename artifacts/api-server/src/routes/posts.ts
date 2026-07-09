import { Router } from "express";
import { randomUUID } from "crypto";
import { supabase } from "@workspace/db";
import { CreatePostBody } from "@workspace/api-zod";

const router = Router();

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("scout_profiles")
    .select("role")
    .eq("userId", userId)
    .single();
  return data?.role === "developer" || data?.role === "leader" || data?.role === "cp_of_cps";
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

async function getProfile(userId: string) {
  const { data } = await supabase
    .from("scout_profiles")
    .select("*")
    .eq("userId", userId)
    .single();
  return data;
}

router.get("/posts", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .order("createdAt", { ascending: false });

  if (!posts) {
    res.json([]);
    return;
  }

  // Enrich with author information
  const enrichedPosts = await Promise.all(
    posts.map(async (post) => {
      const [{ data: author }, { data: profile }] = await Promise.all([
        supabase.from("users").select("firstName, lastName, profileImageUrl").eq("id", post.authorUserId).single(),
        supabase.from("scout_profiles").select("id, role").eq("userId", post.authorUserId).single(),
      ]);
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

  const postId = randomUUID();
  await supabase.from("posts").insert({
    id: postId,
    content: parsed.data.content,
    fileUrl: parsed.data.fileUrl || null,
    fileName: parsed.data.fileName || null,
    fileType: parsed.data.fileType || null,
    authorUserId: req.user.id,
  });

  const [{ data: author }, { data: profile }] = await Promise.all([
    supabase.from("users").select("firstName, lastName, profileImageUrl").eq("id", req.user.id).single(),
    supabase.from("scout_profiles").select("id, role").eq("userId", req.user.id).single(),
  ]);

  const authorName = author ? `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() : "Someone";

  // Create notifications for all users except the author
  try {
    const { data: allUsers } = await supabase
      .from("users")
      .select("id")
      .neq("id", req.user.id);

    if (allUsers && allUsers.length > 0) {
      const notifications = allUsers.map((user) => ({
        id: randomUUID(),
        userId: user.id,
        type: "post" as const,
        title: "New Community Post",
        message: parsed.data.content.length > 100 ? parsed.data.content.slice(0, 100) + "..." : parsed.data.content,
        relatedId: postId,
        authorName,
        isRead: false,
      }));
      await supabase.from("notifications").insert(notifications);
    }
  } catch (err) {
    console.error("Failed to create notifications:", err);
  }

  res.status(201).json({
    id: postId,
    content: parsed.data.content,
    fileUrl: parsed.data.fileUrl || null,
    fileName: parsed.data.fileName || null,
    fileType: parsed.data.fileType || null,
    authorUserId: req.user.id,
    createdAt: new Date().toISOString(),
    authorId: profile?.id,
    authorName,
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

  const postId = req.params.postId;
  if (!postId) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const { data: post } = await supabase
    .from("posts")
    .select("authorUserId")
    .eq("id", postId)
    .single();
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

  await supabase.from("posts").delete().eq("id", postId);
  res.json({ success: true });
});

export default router;
