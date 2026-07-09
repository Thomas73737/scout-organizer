import { Router } from "express";
import { randomUUID } from "crypto";
import { supabase } from "@workspace/db";

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
    await supabase.from("scout_profiles").insert({ id: randomUUID(), userId, role: "scout" });
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

  const { data: target } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .single();
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const transactionData = {
    id: randomUUID(),
    userId,
    points,
    reason,
    awardedBy: req.user.id,
    createdAt: new Date().toISOString(),
  };

  await supabase.from("point_transactions").insert(transactionData);

  res.status(201).json(transactionData);
});

router.get("/points/my", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const { data: transactions } = await supabase
    .from("point_transactions")
    .select("*")
    .eq("userId", req.user.id)
    .order("createdAt", { ascending: false });

  const totalPoints = (transactions || []).reduce((sum, t) => sum + t.points, 0);

  res.json({ totalPoints, transactions: transactions || [] });
});

router.get("/points/user/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const targetUserId = req.params.userId;
  const { data: transactions } = await supabase
    .from("point_transactions")
    .select("*")
    .eq("userId", targetUserId)
    .order("createdAt", { ascending: false });

  const totalPoints = (transactions || []).reduce((sum, t) => sum + t.points, 0);

  const { data: user } = await supabase
    .from("users")
    .select("id, firstName, lastName, profileImageUrl")
    .eq("id", targetUserId)
    .single();

  res.json({
    totalPoints,
    transactions: transactions || [],
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

  const { data: allTransactions } = await supabase
    .from("point_transactions")
    .select("userId, points");

  if (!allTransactions || allTransactions.length === 0) {
    res.json([]);
    return;
  }

  const pointsMap = new Map<string, number>();
  for (const t of allTransactions) {
    pointsMap.set(t.userId, (pointsMap.get(t.userId) || 0) + t.points);
  }

  const userIds = Array.from(pointsMap.keys());
  const { data: users } = await supabase
    .from("users")
    .select("id, firstName, lastName, profileImageUrl")
    .in("id", userIds);

  const userMap = new Map((users || []).map((u) => [u.id, u]));

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
