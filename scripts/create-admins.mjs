import mongoose from "mongoose";
import crypto from "crypto";
import { randomUUID } from "crypto";

const HASH_PREFIX = "$scrypt$";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64");
  return `${HASH_PREFIX}${salt}$${hash}`;
}

const admins = [
  { name: "Samer Emad", phone: "1274316373", password: "nBvtK8e5x5pY" },
  { name: "Andrew George", phone: "1278309854", password: "Nug6B9UQVLs7" },
  { name: "Youssef Ashraf", phone: "1277327360", password: "fBWutp5w48e6" },
  { name: "Ramez Ashraf", phone: "1277326902", password: "xpxc9ePztAy7" },
  { name: "Amir Kamil", phone: "1276679771", password: "ymqSNDamcApN" },
  { name: "David Maged", phone: "1063282192", password: "qqm5pevnecJu" },
  { name: "Paula Hakim", phone: "1200849052", password: "YuhUU3XCaC65" },
  { name: "Youssef Ehab", phone: "1200455560", password: "kFHMRmYRXquN" },
  { name: "George Elhamy", phone: "1283574680", password: "dVGYLKXAqvnr" },
  { name: "Anthony Hany", phone: "1278289381", password: "NIhBHPTWgLM9" },
  { name: "Steven George", phone: "1277515581", password: "hcYZQYgG8Nkf" },
  { name: "Amir Ashraf", phone: "1221159696", password: "cBu3H5UdEbdq" },
  { name: "Philopater Ghobrial", phone: "1221883485", password: "jHF5BaSKeKY6" },
  { name: "Samir Sameh", phone: "1286818030", password: "QaQ2n6sjp4jV" },
  { name: "Youssef Sameh", phone: "1283004494", password: "XU47zrdAPz57" },
  { name: "Rewes Ayman", phone: "1202270659", password: "IQaTj8tmKYEW" },
  { name: "Mina Safwat", phone: "1286727193", password: "T4UGEAyXDBIf" },
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
    const hashed = hashPassword(admin.password);

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
