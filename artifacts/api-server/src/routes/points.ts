import { Router } from "express";
import { randomUUID } from "crypto";
import { PointTransactionModel, UserModel, ScoutProfileModel } from "@workspace/db";

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

router.post("/points/award", async (req, res) => {
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

  const { userId, points, reason } = req.body as { userId?: string; points?: number; reason?: string };
  if (!userId || !points || !reason) {
    res.status(400).json({ error: "userId, points, and reason are required" });
    return;
  }

  const target = await UserModel.findOne({ id: userId });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const transaction = await PointTransactionModel.create({
    id: randomUUID(),
    userId,
    points,
    reason,
    awardedBy: req.user.id,
  });

  res.status(201).json(transaction.toObject());
});

router.get("/points/my", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const transactions = await PointTransactionModel.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);

  res.json({ totalPoints, transactions });
});

router.get("/points/user/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const targetUserId = req.params.userId;
  const transactions = await PointTransactionModel.find({ userId: targetUserId })
    .sort({ createdAt: -1 })
    .lean();

  const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);

  const user = await UserModel.findOne({ id: targetUserId }).lean();

  res.json({
    totalPoints,
    transactions,
    user: user ? {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    } : null,
  });
});

router.get("/points/leaderboard", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const allTransactions = await PointTransactionModel.find().lean();
  const pointsMap = new Map<string, number>();
  for (const t of allTransactions) {
    pointsMap.set(t.userId, (pointsMap.get(t.userId) || 0) + t.points);
  }

  if (pointsMap.size === 0) {
    res.json([]);
    return;
  }

  const userIds = Array.from(pointsMap.keys());
  const users = await UserModel.find({ id: { $in: userIds } }).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));

  const leaderboard = userIds
    .map((userId) => {
      const user = userMap.get(userId);
      return {
        userId,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        profileImageUrl: user?.profileImageUrl ?? null,
        totalPoints: pointsMap.get(userId) || 0,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  res.json(leaderboard);
});

export default router;
