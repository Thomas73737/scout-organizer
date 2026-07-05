import { Router } from "express";
import { randomUUID } from "crypto";
import * as XLSX from "xlsx";
import { hashPassword } from "../lib/password";
import {
  AccessRequestModel,
  UserModel,
  ScoutProfileModel,
} from "@workspace/db";

const router = Router();

async function ensureLeaderOrDeveloper(userId: string) {
  const profile = await ScoutProfileModel.findOne({ userId });
  return profile && (profile.role === "leader" || profile.role === "developer" || profile.role === "cp_of_cps");
}

router.post("/access-requests", async (req, res) => {
  const { 
    name, 
    email, 
    password, 
    phone, 
    section, 
    team, 
    isNewScout,
    nationalId,
    parentsWhatsappNumber,
    homeAddress,
    photoUrl,
    parentNationalIdPhotoUrl,
    patrol
  } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    section?: string;
    team?: string;
    isNewScout?: boolean;
    nationalId?: string;
    parentsWhatsappNumber?: string;
    homeAddress?: string;
    photoUrl?: string;
    parentNationalIdPhotoUrl?: string;
    patrol?: string;
  };

  if (!name || !email || !password || !phone || !section || typeof isNewScout !== 'boolean') {
    res.status(400).json({ error: "name, email, password, phone, section, and isNewScout are required" });
    return;
  }
  if (!isNewScout && !team) {
    res.status(400).json({ error: "team is required for existing scouts" });
    return;
  }

  // Validate three-part name
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length < 3) {
    res.status(400).json({ error: "Please enter your full three-part name (e.g., youssef miro soshi). First name only is not accepted." });
    return;
  }

  // Validate new scout fields
  if (isNewScout) {
    if (!nationalId || !parentsWhatsappNumber || !homeAddress || !photoUrl) {
      res.status(400).json({ error: "nationalId, parentsWhatsappNumber, homeAddress, and photoUrl are required for new scouts" });
      return;
    }
    // Patrol is not required for new scouts
  } else {
    // For existing scouts, patrol is required
    if (!patrol) {
      res.status(400).json({ error: "patrol is required for existing scouts" });
      return;
    }
  }

  const validSections = ["سنافر", "اشبال", "زهرات", "كشافة", "مرشدات"];
  const validTeams = ["A", "B"];
  const validPatrols = ["صقر", "فهد", "ثعلب", "ذئب", "نمر", "نسر", "أسد", "غراب", "بلبل", "ديك", "خفاش", "غزال"];

  if (!validSections.includes(section)) {
    res.status(400).json({ error: "Invalid section. Must be one of: سنافر, اشبال, زهرات, كشافة, مرشدات" });
    return;
  }

  if (team && !validTeams.includes(team.toUpperCase())) {
    res.status(400).json({ error: "Invalid team. Must be A or B" });
    return;
  }

  if (patrol && !validPatrols.includes(patrol)) {
    res.status(400).json({ error: "Invalid patrol. Must be one of: صقر, فهد, ثعلب, ذئب, نمر, نسر, أسد, غراب, بلبل, ديك, خفاش, غزال" });
    return;
  }

  const trimmedTeam = team?.toUpperCase();

  try {
    // Check if user already exists by email or phone
    const existingUser = await UserModel.findOne({ 
      $or: [{ email: email.trim() }, { phone: phone.trim() }] 
    });
    if (existingUser) {
      res.status(400).json({ error: "A user with this email or phone number already exists" });
      return;
    }

    // Create user with pending status
    const newUserId = randomUUID();
    const nameParts = name.trim().split(/\s+/);
    const user = await UserModel.create({
      id: newUserId,
      firstName: nameParts[0], // First name
      lastName: nameParts.slice(1).join(" "), // Middle and last names combined
      email: email.trim(),
      password: hashPassword(password),
      phone: phone.trim(),
      section: section,
      team: trimmedTeam,
      profileImageUrl: isNewScout ? photoUrl : undefined,
      nationalId: isNewScout ? nationalId : undefined,
      parentsWhatsappNumber: isNewScout ? parentsWhatsappNumber : undefined,
      homeAddress: isNewScout ? homeAddress : undefined,
      parentNationalIdPhotoUrl: isNewScout ? parentNationalIdPhotoUrl : undefined,
      patrol: patrol || undefined, // Save patrol only if provided
      status: "pending",
    });

    // Create corresponding access request for tracking
    await AccessRequestModel.create({
      id: randomUUID(),
      name: name.trim(),
      email: email.trim(),
      password: hashPassword(password),
      phone: phone.trim(),
      section: section,
      team: trimmedTeam,
      isNewScout,
      nationalId: isNewScout ? nationalId : undefined,
      parentsWhatsappNumber: isNewScout ? parentsWhatsappNumber : undefined,
      homeAddress: isNewScout ? homeAddress : undefined,
      photoUrl: isNewScout ? photoUrl : undefined,
      parentNationalIdPhotoUrl: isNewScout ? parentNationalIdPhotoUrl : undefined,
      patrol: patrol || undefined, // Save patrol only if provided
      status: "pending",
    });

    res.status(201).json({ 
      message: "Access request submitted. Please wait for admin approval.",
      userId: newUserId,
      status: "pending"
    });
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

  if (!(await ensureLeaderOrDeveloper((req as any).user?.id))) {
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

  if (!(await ensureLeaderOrDeveloper((req as any).user?.id))) {
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
    // Find the user by email (created during registration)
    const user = await UserModel.findOne({ email: request.email });
    
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Update user status to approved and copy additional fields from request
    user.status = "approved";
    user.updatedAt = new Date();
    
    // Copy new scout fields if they exist in the request
    if (request.whatsappNumber) user.whatsappNumber = request.whatsappNumber;
    if (request.parentsWhatsappNumber) user.parentsWhatsappNumber = request.parentsWhatsappNumber;
    if (request.homeAddress) user.homeAddress = request.homeAddress;
    if (request.photoUrl) user.profileImageUrl = request.photoUrl;
    // Copy patrol if provided in the request (for both new and existing scouts)
    if (request.patrol) user.patrol = request.patrol;
    
    await user.save();

    // Create scout profile
    const existingProfile = await ScoutProfileModel.findOne({ userId: user.id });
    if (!existingProfile) {
      await ScoutProfileModel.create({
        id: randomUUID(),
        userId: user.id!,
        role: "scout",
      });
    }

    // Update access request status
    request.status = "approved";
    request.updatedAt = new Date();
    await request.save();

    res.json({ message: "Request approved and account activated", userId: user.id });
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

  if (!(await ensureLeaderOrDeveloper((req as any).user?.id))) {
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
    // Find the user by email (created during registration)
    const user = await UserModel.findOne({ email: request.email });
    
    if (user) {
      // Update user status to denied
      user.status = "denied";
      user.updatedAt = new Date();
      await user.save();
    }

    // Update access request status
    request.status = "denied";
    request.updatedAt = new Date();
    await request.save();

    res.json({ message: "Request denied" });
  } catch (err: any) {
    console.error("Failed to deny request:", err?.message ?? err);
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.get("/access-requests/export", async (req, res) => {
  if (!(req as any).isAuthenticated?.()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!(await ensureLeaderOrDeveloper((req as any).user?.id))) {
    res.status(403).json({ error: "Leaders only" });
    return;
  }

  try {
    const requests = await AccessRequestModel.find({ isNewScout: true })
      .sort({ createdAt: -1 })
      .lean();

    const data = requests.map((r, i) => ({
      "#": i + 1,
      "Name": r.name || "",
      "Email": r.email || "",
      "Phone": r.phone || "",
      "Section": r.section || "",
      "Team": r.team || "",
      "WhatsApp": r.whatsappNumber || "",
      "Parents WhatsApp": r.parentsWhatsappNumber || "",
      "Home Address": r.homeAddress || "",
      "National ID": r.nationalId || "",
      "Patrol": r.patrol || "",
      "Status": r.status || "",
      "Submitted At": r.createdAt ? new Date(r.createdAt).toLocaleString("en-GB") : "",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "New Scout Requests");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="scout-requests-${Date.now()}.xlsx"`);
    res.send(buf);
  } catch (err: any) {
    console.error("Failed to export requests:", err?.message ?? err);
    res.status(500).json({ error: "Failed to export data" });
  }
});

export default router;
