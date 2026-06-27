import { Router } from "express";
import { randomUUID } from "crypto";
import {
  AccessRequestModel,
  UserModel,
  ScoutProfileModel,
} from "@workspace/db";

const router = Router();

async function ensureLeader(userId: string) {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile && profile.role === "leader";
}

router.post("/access-requests", async (req, res) => {
  const { name, phone, team } = req.body as {
    name?: string;
    phone?: string;
    team?: string;
  };

  if (!name || !phone || !team) {
    res.status(400).json({ error: "name, phone and team are required" });
    return;
  }

  try {
    await AccessRequestModel.create({
      id: randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      team: team.trim(),
      status: "pending",
    });

    res.status(201).json({ message: "Access request submitted" });
  } catch (err: any) {
    console.error("Failed to create access request:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.get("/access-requests", async (req, res) => {
  if (!(req as any).isAuthenticated?.()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!(await ensureLeader((req as any).user?.id))) {
    res.status(403).json({ error: "Leaders only" });
    return;
  }

  const requests = await AccessRequestModel.find().sort({ createdAt: -1 });
  res.json(requests);
});

router.post("/access-requests/:requestId/approve", async (req, res) => {
  if (!(req as any).isAuthenticated?.()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!(await ensureLeader((req as any).user?.id))) {
    res.status(403).json({ error: "Leaders only" });
    return;
  }

  const requestId = req.params.requestId;
  const request = await AccessRequestModel.findOne({ id: requestId });

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  if (request.status !== "pending") {
    res.status(400).json({ error: "Request is already handled" });
    return;
  }

  try {
    const newUserId = randomUUID();
    const user = await UserModel.create({
      id: newUserId,
      firstName: request.name.split(" ")[0],
      lastName: request.name.split(" ").slice(1).join(" ") || undefined,
      phone: request.phone,
      team: request.team,
    });

    await ScoutProfileModel.create({
      id: randomUUID(),
      userId: newUserId,
      role: "scout",
    });

    request.status = "approved";
    request.updatedAt = new Date();
    await request.save();

    res.json({ message: "Request approved and account created", userId: newUserId });
  } catch (err: any) {
    console.error("Failed to approve request:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.post("/access-requests/:requestId/deny", async (req, res) => {
  if (!(req as any).isAuthenticated?.()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!(await ensureLeader((req as any).user?.id))) {
    res.status(403).json({ error: "Leaders only" });
    return;
  }

  const requestId = req.params.requestId;
  const request = await AccessRequestModel.findOne({ id: requestId });

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  if (request.status !== "pending") {
    res.status(400).json({ error: "Request is already handled" });
    return;
  }

  try {
    request.status = "denied";
    request.updatedAt = new Date();
    await request.save();

    res.json({ message: "Request denied" });
  } catch (err: any) {
    console.error("Failed to deny request:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
