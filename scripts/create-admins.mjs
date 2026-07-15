import mongoose from "mongoose";
import crypto from "crypto";
import { randomUUID } from "crypto";

const HASH_PREFIX = "$scrypt$";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64");
  return `${HASH_PREFIX}${salt}$${hash}`;
}

const DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || "CHANGE_ME_BEFORE_RUNNING";

const admins = [
  { name: "Samer Emad", phone: "1274316373" },
  { name: "Andrew George", phone: "1278309854" },
  { name: "Youssef Ashraf", phone: "1277327360" },
  { name: "Ramez Ashraf", phone: "1277326902" },
  { name: "Amir Kamil", phone: "1276679771" },
  { name: "David Maged", phone: "1063282192" },
  { name: "Paula Hakim", phone: "1200849052" },
  { name: "Youssef Ehab", phone: "1200455560" },
  { name: "George Elhamy", phone: "1283574680" },
  { name: "Anthony Hany", phone: "1278289381" },
  { name: "Steven George", phone: "1277515581" },
  { name: "Amir Ashraf", phone: "1221159696" },
  { name: "Philopater Ghobrial", phone: "1221883485" },
  { name: "Samir Sameh", phone: "1286818030" },
  { name: "Youssef Sameh", phone: "1283004494" },
  { name: "Rewes Ayman", phone: "1202270659" },
  { name: "Mina Safwat", phone: "1286727193" },
];

function parseName(name) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || parts[0] };
}

async function createAdmins() {
  const url = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";
  await mongoose.connect(url);
  console.log("Connected to MongoDB");

  const usersCol = mongoose.connection.db.collection("users");
  const profilesCol = mongoose.connection.db.collection("scoutprofiles");

  let created = 0;
  let skipped = 0;

  for (const admin of admins) {
    const { firstName, lastName } = parseName(admin.name);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, "")}@scout.local`;

    const existing = await usersCol.findOne({ phone: admin.phone });
    if (existing) {
      console.log(`Skipping ${admin.name} (already exists)`);
      skipped++;
      continue;
    }

    const userId = randomUUID();
    const hashed = hashPassword(DEFAULT_PASSWORD);

    await usersCol.insertOne({
      id: userId,
      email,
      password: hashed,
      firstName,
      lastName,
      phone: admin.phone,
      section: "كشافة",
      team: "A",
      status: "approved",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await profilesCol.insertOne({
      id: randomUUID(),
      userId,
      role: "leader",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`Created admin: ${admin.name} (${email})`);
    created++;
  }

  console.log(`\nDone! ${created} created, ${skipped} skipped`);
  await mongoose.disconnect();
}

createAdmins().catch((err) => { console.error(err); process.exit(1); });
