import { Router } from "express";
import { NotificationModel } from "@workspace/db";

const router = Router();

router.get("/notifications", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const notifications = await NotificationModel.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unreadCount = await NotificationModel.countDocuments({
    userId: req.user.id,
    isRead: false,
  });

  res.json({ notifications, unreadCount });
});

router.post("/notifications/:id/read", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await NotificationModel.updateOne(
    { id: req.params.id, userId: req.user.id },
    { $set: { isRead: true } },
  );

  res.json({ success: true });
});

router.post("/notifications/read-all", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await NotificationModel.updateMany(
    { userId: req.user.id, isRead: false },
    { $set: { isRead: true } },
  );

  res.json({ success: true });
});

export default router;
