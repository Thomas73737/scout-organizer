import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

async function createAdminProfile() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");
    const profilesCollection = db.collection("scoutprofiles");

    // Get admin user
    const adminUser = await usersCollection.findOne({ email: ADMIN_EMAIL });
    
    if (!adminUser) {
      console.log("❌ Admin user not found");
      return;
    }

    console.log("Found admin user:", adminUser.email);

    // Check if profile already exists
    const existingProfile = await profilesCollection.findOne({ userId: adminUser.id });
    
    if (existingProfile) {
      console.log("Admin profile already exists, updating role to leader...");
      await profilesCollection.updateOne(
        { userId: adminUser.id },
        { $set: { role: "leader", updatedAt: new Date() } }
      );
      console.log("✅ Admin profile updated to leader role");
    } else {
      console.log("Creating admin profile with leader role...");
      await profilesCollection.insertOne({
        id: randomUUID(),
        userId: adminUser.id,
        role: "leader",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("✅ Admin profile created with leader role");
    }

    // Verify the profile
    const adminProfile = await profilesCollection.findOne({ userId: adminUser.id });
    console.log("\nAdmin profile:", JSON.stringify(adminProfile, null, 2));

  } catch (error) {
    console.error("Error creating admin profile:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

createAdminProfile();