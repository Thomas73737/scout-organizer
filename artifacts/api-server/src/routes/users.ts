import { Router } from "express";
import { UserModel, ScoutProfileModel } from "@workspace/db";
import { UpdateUserRoleBody } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router = Router();

async function ensureProfile(userId: string) {
  const existing = await ScoutProfileModel.findOne({ userId });
  if (!existing) {
    await ScoutProfileModel.create({ id: randomUUID(), userId, role: "scout" });
  }
}

async function getUserWithRole(userId: string) {
  const [user, profile] = await Promise.all([
    UserModel.findOne({ id: userId }),
    ScoutProfileModel.findOne({ userId }),
  ]);

  if (!user || !profile) return null;

  return {
    id: profile.id,
    replitId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    profileImageUrl: user.profileImageUrl,
    role: profile.role,
    createdAt: profile.createdAt,
  };
}

router.get("/users", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const profile = await getUserWithRole(req.user.id);
  if (!profile || profile.role !== "leader") {
    res.status(403).json({ error: "Leaders only" });
    return;
  }

  const profiles = await ScoutProfileModel.find().sort({ createdAt: -1 });
  const users = await Promise.all(
    profiles.map(async (profile) => {
      const user = await UserModel.findOne({ id: profile.userId });
      return {
        id: profile.id,
        replitId: user?.id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        profileImageUrl: user?.profileImageUrl,
        role: profile.role,
        createdAt: profile.createdAt,
      };
    })
  );

  res.json(users);
});

router.get("/users/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const profile = await getUserWithRole(req.user.id);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profile);
});

router.get("/users/stats", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const scoutCount = await ScoutProfileModel.countDocuments({ role: "scout" });
  const leaderCount = await ScoutProfileModel.countDocuments({ role: "leader" });

  res.json({
    totalScouts: scoutCount,
    totalLeaders: leaderCount,
    totalMembers: scoutCount + leaderCount,
  });
});

router.patch("/users/:userId/role", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);
  const myProfile = await getUserWithRole(req.user.id);
  if (!myProfile || myProfile.role !== "leader") {
    res.status(403).json({ error: "Leaders only" });
    return;
  }

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const targetUserId = req.params.userId;
  const targetUser = await UserModel.findOne({ id: targetUserId });

  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await ensureProfile(targetUserId);
  await ScoutProfileModel.findOneAndUpdate(
    { userId: targetUserId },
    { role: parsed.data.role }
  );

  const updated = await getUserWithRole(targetUserId);
  res.json(updated);
});

export default router;
