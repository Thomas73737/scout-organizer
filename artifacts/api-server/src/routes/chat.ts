import { Router } from "express";
import { randomUUID } from "crypto";
import { ChatMessageModel, UserModel, ScoutProfileModel } from "@workspace/db";

const router = Router();

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile?.role === "developer" || profile?.role === "leader";
}

async function ensureProfile(userId: string) {
  const existing = await ScoutProfileModel.findOne({ userId });
  if (!existing) {
    await ScoutProfileModel.create({ id: randomUUID(), userId, role: "scout" });
  }
}

router.get("/chat/conversations", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const userId = req.user.id;
  const messages = await ChatMessageModel.find({
    $or: [{ senderId: userId }, { receiverId: userId }],
  })
    .sort({ createdAt: -1 })
    .lean();

  const userIds = new Set<string>();
  for (const msg of messages) {
    if (msg.senderId !== userId) userIds.add(msg.senderId);
    if (msg.receiverId !== userId) userIds.add(msg.receiverId);
  }

  const users = await UserModel.find({ id: { $in: Array.from(userIds) } }).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));

  const conversationMap = new Map<string, { userId: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null; lastMessage: string; lastMessageTime: Date; unreadCount: number }>();

  for (const msg of messages) {
    const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
    const other = userMap.get(otherId);
    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, {
        userId: otherId,
        firstName: other?.firstName ?? null,
        lastName: other?.lastName ?? null,
        profileImageUrl: other?.profileImageUrl ?? null,
        lastMessage: msg.content,
        lastMessageTime: msg.createdAt!,
        unreadCount: msg.receiverId === userId && !msg.isRead ? 1 : 0,
      });
    } else {
      const conv = conversationMap.get(otherId)!;
      if (msg.receiverId === userId && !msg.isRead) {
        conv.unreadCount += 1;
      }
    }
  }

  const conversations = Array.from(conversationMap.values())
    .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());

  res.json(conversations);
});

router.get("/chat/messages/:otherUserId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const { otherUserId } = req.params;
  const userId = req.user.id;

  const messages = await ChatMessageModel.find({
    $or: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId },
    ],
  })
    .sort({ createdAt: 1 })
    .lean();

  const userIds = [userId, otherUserId];
  const users = await UserModel.find({ id: { $in: userIds } }).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));

  const enriched = messages.map((msg) => ({
    ...msg,
    senderName: userMap.get(msg.senderId) ? `${userMap.get(msg.senderId)!.firstName ?? ""} ${userMap.get(msg.senderId)!.lastName ?? ""}`.trim() : null,
    senderImageUrl: userMap.get(msg.senderId)?.profileImageUrl ?? null,
  }));

  await ChatMessageModel.updateMany(
    { senderId: otherUserId, receiverId: userId, isRead: false },
    { isRead: true },
  );

  res.json(enriched);
});

router.post("/chat/send", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const { receiverId, content } = req.body as { receiverId?: string; content?: string };
  if (!receiverId || !content) {
    res.status(400).json({ error: "receiverId and content are required" });
    return;
  }

  const receiver = await UserModel.findOne({ id: receiverId });
  if (!receiver) {
    res.status(404).json({ error: "Receiver not found" });
    return;
  }

  const message = await ChatMessageModel.create({
    id: randomUUID(),
    senderId: req.user.id,
    receiverId,
    content,
    isRead: false,
  });

  res.status(201).json(message.toObject());
});

router.get("/chat/unread-count", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const count = await ChatMessageModel.countDocuments({
    receiverId: req.user.id,
    isRead: false,
  });

  res.json({ unreadCount: count });
});

export default router;
