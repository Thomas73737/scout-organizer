import { Router } from "express";
import { randomUUID } from "crypto";
import { supabase } from "@workspace/db";
import { UpdateUserRoleBody } from "@workspace/api-zod";
import { createSession } from "../lib/auth";
import { hashPassword, verifyPassword } from "../lib/password";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import express from "express";
import * as path from "path";
import * as fs from "fs";

const objectStorage = new ObjectStorageService();

const router = Router();

async function ensureProfile(userId: string) {
  const { data } = await supabase
    .from("scout_profiles")
    .select("id")
    .eq("userId", userId)
    .single();
  if (!data) {
    await supabase.from("scout_profiles").insert({
      id: randomUUID(),
      userId,
      role: "scout",
    });
  }
}

async function getUserWithRole(userId: string) {
  const [userResult, profileResult] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).single(),
    supabase.from("scout_profiles").select("*").eq("userId", userId).single(),
  ]);

  const user = userResult.data;
  const profile = profileResult.data;

  if (!user || !profile) return null;

  return {
    id: profile.id,
    replitId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    profileImageUrl: user.profileImageUrl,
    role: profile.role,
    patrol: user.patrol,
    mainBadge: user.mainBadge || null,
    proficiencyBadges: user.proficiencyBadges || [],
    hobbyBadges: user.hobbyBadges || [],
    whatsappNumber: user.whatsappNumber,
    parentsWhatsappNumber: user.parentsWhatsappNumber,
    homeAddress: user.homeAddress,
    createdAt: profile.createdAt,
  };
}

async function isDeveloperOrLeader(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("scout_profiles")
    .select("role")
    .eq("userId", userId)
    .single();
  return data?.role === "developer" || data?.role === "leader" || data?.role === "cp_of_cps";
}

async function isDeveloper(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("scout_profiles")
    .select("role")
    .eq("userId", userId)
    .single();
  return data?.role === "developer";
}

// Update profile image for the authenticated user
router.post("/users/me/profile-image", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { profileImageUrl } = req.body as { profileImageUrl?: string };

  if (!profileImageUrl) {
    res.status(400).json({ error: "profileImageUrl is required" });
    return;
  }

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("id", req.user.id)
      .single();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await supabase
      .from("users")
      .update({ profileImageUrl, updatedAt: new Date().toISOString() })
      .eq("id", req.user.id);

    res.json({ message: "Profile image updated successfully", profileImageUrl });
  } catch (err: any) {
    console.error("Failed to update profile image:", err?.message ?? err);
    res.status(500).json({ error: "Failed to update profile image" });
  }
});

// Direct profile image upload (multipart-free, accepts raw image body)
router.post("/users/me/profile-image/upload",
  express.raw({ type: 'image/*', limit: '5mb' }),
  async (req, res) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const buffer = req.body as Buffer;
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      res.status(400).json({ error: "No image data received" });
      return;
    }

    const contentType = req.headers['content-type'] || 'image/jpeg';
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/svg+xml': '.svg',
      'image/heic': '.heic',
      'image/heif': '.heif',
      'image/avif': '.avif',
    };
    const ext = extMap[contentType] || '.jpg';
    const objectId = randomUUID();
    const fileName = `${objectId}${ext}`;

    const storageDir = path.join(process.cwd(), "local-storage", "uploads");
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const filePath = path.join(storageDir, fileName);
    fs.writeFileSync(filePath, buffer);

    try {
      fs.writeFileSync(filePath + '.meta', JSON.stringify({ originalName: `profile${ext}` }), 'utf-8');
    } catch {}

    const imageUrl = `/api/storage/objects/uploads/${fileName}`;

    try {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("id", req.user.id)
        .single();
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await supabase
        .from("users")
        .update({ profileImageUrl: imageUrl, updatedAt: new Date().toISOString() })
        .eq("id", req.user.id);
      res.json({ message: "Profile image updated successfully", profileImageUrl: imageUrl });
    } catch (err: any) {
      console.error("Failed to update profile image:", err?.message ?? err);
      res.status(500).json({ error: "Failed to update profile image" });
    }
  }
);

// Delete profile image for the authenticated user
router.delete("/users/me/profile-image", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id, profileImageUrl")
      .eq("id", req.user.id)
      .single();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const currentUrl = user.profileImageUrl;
    await supabase
      .from("users")
      .update({ profileImageUrl: "", updatedAt: new Date().toISOString() })
      .eq("id", req.user.id);

    // Try to delete the stored file if it's a local/uploaded image
    if (currentUrl) {
      try {
        const pathname = currentUrl.startsWith("http")
          ? new URL(currentUrl).pathname
          : currentUrl;
        const objectPath = pathname.replace("/api/storage/objects", "");
        const file = await objectStorage.getObjectEntityFile(objectPath);
        await objectStorage.deleteObject(file);
      } catch (deleteErr) {
        if (!(deleteErr instanceof ObjectNotFoundError)) {
          console.error("Failed to delete profile image file:", deleteErr);
        }
      }
    }

    res.json({ message: "Profile image removed successfully" });
  } catch (err: any) {
    console.error("Failed to remove profile image:", err?.message ?? err);
    res.status(500).json({ error: "Failed to remove profile image" });
  }
});

// Change password for the authenticated user
router.post("/users/change-password", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!newPassword) {
    res.status(400).json({ error: "newPassword is required" });
    return;
  }

  if (newPassword.length < 4) {
    res.status(400).json({ error: "New password must be at least 4 characters" });
    return;
  }

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id, password")
      .eq("id", req.user.id)
      .single();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // If user already has a password set, verify the current password
    if (user.password) {
      if (!currentPassword) {
        res.status(400).json({ error: "currentPassword is required" });
        return;
      }
      if (!verifyPassword(currentPassword, user.password)) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }
    }
    // If user has no password (e.g. OIDC user), skip currentPassword check

    await supabase
      .from("users")
      .update({ password: hashPassword(newPassword), updatedAt: new Date().toISOString() })
      .eq("id", req.user.id);

    res.json({ message: "Password changed successfully" });
  } catch (err: any) {
    console.error("Failed to change password:", err?.message ?? err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

router.get("/users", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await ensureProfile(req.user.id);

  const { data: profiles } = await supabase
    .from("scout_profiles")
    .select("*")
    .order("createdAt", { ascending: false });

  if (!profiles) {
    res.json([]);
    return;
  }

  const users = await Promise.all(
    profiles.map(async (profile) => {
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", profile.userId)
        .single();
      return {
        id: profile.id,
        replitId: user?.id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        profileImageUrl: user?.profileImageUrl,
        role: profile.role,
        patrol: user?.patrol,
        mainBadge: user?.mainBadge || null,
        proficiencyBadges: user?.proficiencyBadges || [],
        hobbyBadges: user?.hobbyBadges || [],
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

// GET /api/users/:userId/profile - Get any user's public profile with badges
router.get("/users/:userId/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profile = await getUserWithRole(req.params.userId);
  if (!profile) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(profile);
});

router.get("/users/stats", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [{ count: scoutCount }, { count: cpCount }, { count: cpOfCpsCount }, { count: leaderCount }, { count: developerCount }] = await Promise.all([
    supabase.from("scout_profiles").select("*", { count: "exact", head: true }).eq("role", "scout"),
    supabase.from("scout_profiles").select("*", { count: "exact", head: true }).eq("role", "cp"),
    supabase.from("scout_profiles").select("*", { count: "exact", head: true }).eq("role", "cp_of_cps"),
    supabase.from("scout_profiles").select("*", { count: "exact", head: true }).eq("role", "leader"),
    supabase.from("scout_profiles").select("*", { count: "exact", head: true }).eq("role", "developer"),
  ]);

  res.json({
    totalScouts: scoutCount || 0,
    totalCp: cpCount || 0,
    totalCpOfCps: cpOfCpsCount || 0,
    totalLeaders: leaderCount || 0,
    totalDevelopers: developerCount || 0,
    totalMembers: (scoutCount || 0) + (cpCount || 0) + (cpOfCpsCount || 0) + (leaderCount || 0) + (developerCount || 0),
  });
});

router.patch("/users/:userId/role", async (req, res) => {
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

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const targetUserId = req.params.userId;
  const { data: targetUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", targetUserId)
    .single();

  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await ensureProfile(targetUserId);
  await supabase
    .from("scout_profiles")
    .update({ role: parsed.data.role })
    .eq("userId", targetUserId);

  const updated = await getUserWithRole(targetUserId);
  res.json(updated);
});

router.patch("/users/:userId/patrol", async (req, res) => {
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

  const { patrol } = req.body as { patrol?: string };
  
  if (!patrol) {
    res.status(400).json({ error: "patrol is required" });
    return;
  }

  const validPatrols = ["صقر", "فهد", "ثعلب", "ذئب", "نمر", "نسر", "أسد", "غراب", "بلبل", "ديك", "خفاش", "غزال"];
  if (!validPatrols.includes(patrol)) {
    res.status(400).json({ error: "Invalid patrol" });
    return;
  }

  const targetUserId = req.params.userId;
  const { data: targetUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", targetUserId)
    .single();

  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await supabase
    .from("users")
    .update({ patrol, updatedAt: new Date().toISOString() })
    .eq("id", targetUserId);

  const updated = await getUserWithRole(targetUserId);
  res.json(updated);
});

// Login endpoint for form-based authentication
router.post("/users/login", async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  try {
    // Find user by email or phone
    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", trimmedEmail)
      .single();

    if (!user) {
      const { data: phoneUser } = await supabase
        .from("users")
        .select("*")
        .eq("phone", trimmedEmail)
        .single();
      user = phoneUser;
    }

    if (!user) {
      res.status(404).json({ error: "User not found with this email or phone. Please submit an access request first." });
      return;
    }

    // Check password matches (supports both hashed and legacy plaintext passwords)
    if (!verifyPassword(trimmedPassword, user.password ?? "")) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    // Check user status
    if (user.status === "pending") {
      res.status(403).json({ 
        error: "Your account is pending approval. Please wait for an admin to approve your request.",
        status: "pending"
      });
      return;
    }

    if (user.status === "denied") {
      res.status(403).json({ 
        error: "Your account request was denied. Please contact an admin for more information.",
        status: "denied"
      });
      return;
    }

    if (user.status === "banned") {
      res.status(403).json({ 
        error: "This account has been banned",
        status: "banned"
      });
      return;
    }

    // If status is undefined or not set, treat as approved
    if (!user.status) {
      await supabase
        .from("users")
        .update({ status: "approved" })
        .eq("id", user.id);
    }

    // Ensure user has a profile
    await ensureProfile(user.id);
    const profile = await getUserWithRole(user.id);
    
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    // Create session
    const sessionData = {
      user: {
        id: user.id,
        email: user.email || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        profileImageUrl: user.profileImageUrl || null,
      },
      access_token: "mock_token_" + randomUUID(),
    };

    const sid = await createSession(sessionData);
    
    // Set session cookie
    res.cookie("sid", sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      user: profile,
      isAdmin: profile.role === "leader" || profile.role === "developer" || profile.role === "cp_of_cps"
    });
  } catch (err: any) {
    console.error("Login failed:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Temporary endpoint to create admin account (REMOVE IN PRODUCTION)
router.post("/users/create-admin", async (req, res) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, and password are required" });
    return;
  }

  try {
    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from("users")
      .select("id")
      .or(`firstName.eq.${name},email.eq.${email}`)
      .maybeSingle();

    if (existingAdmin) {
      res.status(400).json({ error: "Admin account already exists" });
      return;
    }

    // Create admin user
    const adminUserId = randomUUID();
    await supabase.from("users").insert({
      id: adminUserId,
      firstName: name,
      lastName: "Admin",
      email,
      password: hashPassword(password),
      phone: "0000000000",
      section: "كشافة",
      team: "A",
      status: "approved",
    });

    // Create admin profile with leader role
    await supabase.from("scout_profiles").insert({
      id: randomUUID(),
      userId: adminUserId,
      role: "leader",
    });

    console.log("Admin account created successfully:", name, email);
    res.json({ 
      message: "Admin account created successfully",
      userId: adminUserId,
      name: name,
      email: email
    });
  } catch (err: any) {
    console.error("Failed to create admin account:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Check user approval status endpoint
router.post("/users/check-status", async (req, res) => {
  const { email } = req.body as {
    email?: string;
  };

  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const trimmedEmail = email.trim();

  try {
    const { data: user } = await supabase
      .from("users")
      .select("status, email, firstName, lastName")
      .eq("email", trimmedEmail)
      .single();
    
    if (!user) {
      res.status(404).json({ error: "User not found", status: "not_found" });
      return;
    }

    res.json({ 
      status: user.status || "approved",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });
  } catch (err: any) {
    console.error("Failed to check user status:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Developer endpoint: Ban user
router.post("/users/ban", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Developers and leaders only" });
    return;
  }

  const { userId } = req.body as { userId?: string };

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await supabase
      .from("users")
      .update({ status: "banned" })
      .eq("id", userId);

    console.log(`User ${userId} banned by ${req.user.id}`);
    res.json({ message: "User banned successfully", userId: user.id });
  } catch (err: any) {
    console.error("Failed to ban user:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Developer endpoint: Change user role
router.post("/users/change-role", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Developers and leaders only" });
    return;
  }

  const { userId, newRole } = req.body as {
    userId?: string;
    newRole?: string;
  };

  if (!userId || !newRole) {
    res.status(400).json({ error: "userId and newRole are required" });
    return;
  }

  if (!["scout", "cp", "leader", "developer"].includes(newRole)) {
    res.status(400).json({ error: "Invalid role. Must be scout, cp, leader, or developer" });
    return;
  }

  try {
    const { data: profile } = await supabase
      .from("scout_profiles")
      .select("id")
      .eq("userId", userId)
      .single();
    if (!profile) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    await supabase
      .from("scout_profiles")
      .update({ role: newRole })
      .eq("userId", userId);

    console.log(`User ${userId} role changed to ${newRole} by ${req.user.id}`);
    res.json({ message: "User role changed successfully", userId, newRole });
  } catch (err: any) {
    console.error("Failed to change user role:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Developer endpoint: Unban user
router.post("/users/unban", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloperOrLeader(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Developers and leaders only" });
    return;
  }

  const { userId } = req.body as { userId?: string };

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await supabase
      .from("users")
      .update({ status: "approved" })
      .eq("id", userId);

    console.log(`User ${userId} unbanned by ${req.user.id}`);
    res.json({ message: "User unbanned successfully", userId: user.id });
  } catch (err: any) {
    console.error("Failed to unban user:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Developer endpoint: Delete user account
router.delete("/users/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const hasAccess = await isDeveloper(req.user.id);
  if (!hasAccess) {
    res.status(403).json({ error: "Developers only" });
    return;
  }

  const targetUserId = req.params.userId;

  // Prevent developers from deleting themselves
  if (targetUserId === req.user.id) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("id", targetUserId)
      .single();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Delete user profile
    await supabase.from("scout_profiles").delete().eq("userId", targetUserId);

    // Delete user account
    await supabase.from("users").delete().eq("id", targetUserId);

    console.log(`User ${targetUserId} deleted by developer ${req.user.id}`);
    res.json({ message: "User deleted successfully", userId: targetUserId });
  } catch (err: any) {
    console.error("Failed to delete user:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

// Temporary endpoint to update admin password (REMOVE IN PRODUCTION)
router.post("/users/update-admin-password", async (req, res) => {
  const { email, newPassword } = req.body as {
    email?: string;
    newPassword?: string;
  };

  if (!email || !newPassword) {
    res.status(400).json({ error: "email and newPassword are required" });
    return;
  }

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();
    
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await supabase
      .from("users")
      .update({ password: hashPassword(newPassword), updatedAt: new Date().toISOString() })
      .eq("id", user.id);

    console.log(`Password updated for user: ${email}`);
    res.json({ message: "Password updated successfully", email: email });
  } catch (err: any) {
    console.error("Failed to update password:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
