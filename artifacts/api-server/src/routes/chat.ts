import { Router } from "express";
import { randomUUID } from "crypto";
import { ChatMessageModel, UserModel, ScoutProfileModel, NotificationModel, PushSubscriptionModel } from "@workspace/db";
import { sendPushNotificationToMany } from "../lib/pushNotification";

const router = Router();

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile?.role === "developer" || profile?.role === "leader" || profile?.role === "cp_of_cps";
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
    const lastMsg = msg.isDeleted ? "Message deleted" : msg.content;
    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, {
        userId: otherId,
        firstName: other?.firstName ?? null,
        lastName: other?.lastName ?? null,
        profileImageUrl: other?.profileImageUrl ?? null,
        lastMessage: lastMsg,
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

  const replyToIds = messages.map((m) => m.replyToId).filter(Boolean) as string[];
  let replyToMap = new Map<string, { content: string; senderName: string }>();
  if (replyToIds.length > 0) {
    const repliedMessages = await ChatMessageModel.find({ id: { $in: replyToIds } }).lean();
    for (const rm of repliedMessages) {
      const ru = userMap.get(rm.senderId);
      const rn = ru ? `${ru.firstName ?? ""} ${ru.lastName ?? ""}`.trim() : "Unknown";
      const rc = rm.isDeleted ? "Message deleted" : rm.content;
      replyToMap.set(rm.id, { content: rc, senderName: rn });
    }
  }

  const enriched = messages.map((msg) => ({
    ...msg,
    senderName: userMap.get(msg.senderId) ? `${userMap.get(msg.senderId)!.firstName ?? ""} ${userMap.get(msg.senderId)!.lastName ?? ""}`.trim() : null,
    senderImageUrl: userMap.get(msg.senderId)?.profileImageUrl ?? null,
    isEdited: msg.isEdited ?? false,
    isDeleted: msg.isDeleted ?? false,
    replyTo: msg.replyToId ? (replyToMap.get(msg.replyToId) ?? null) : null,
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

  const { receiverId, content, replyToId } = req.body as { receiverId?: string; content?: string; replyToId?: string };
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
    ...(replyToId ? { replyToId } : {}),
  });

  const sender = await UserModel.findOne({ id: req.user.id }).lean();
  const senderName = sender ? `${sender.firstName ?? ""} ${sender.lastName ?? ""}`.trim() : "Unknown";

  await NotificationModel.create({
    id: randomUUID(),
    userId: receiverId,
    type: "message",
    title: "New Message",
    message: content,
    relatedId: message.id,
    authorName: senderName,
    isRead: false,
  });

  const subscriptions = await PushSubscriptionModel.find({ userId: receiverId }).lean();
  if (subscriptions.length > 0) {
    const pushResult = await sendPushNotificationToMany(
      subscriptions.map((s) => ({ endpoint: s.endpoint, keys: s.keys })),
      senderName,
      content,
      { type: "message", messageId: message.id, url: "/chat" },
    );
    if (pushResult.failed.length > 0) {
      await PushSubscriptionModel.deleteMany({
        endpoint: { $in: pushResult.failed.map((f) => f.subscription.endpoint) },
      });
    }
  }

  res.status(201).json(message.toObject());
});

router.put("/chat/messages/:messageId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { messageId } = req.params;
  const { content } = req.body as { content?: string };
  if (!content || !content.trim()) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const message = await ChatMessageModel.findOne({ id: messageId });
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (message.senderId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  message.content = content.trim();
  message.isEdited = true;
  await message.save();

  res.json(message.toObject());
});

router.delete("/chat/messages/:messageId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { messageId } = req.params;

  const message = await ChatMessageModel.findOne({ id: messageId });
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (message.senderId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  message.content = "This message was deleted";
  message.isDeleted = true;
  message.isEdited = false;
  await message.save();

  res.json({ success: true });
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
