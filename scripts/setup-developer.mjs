import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";
const DEVELOPER_PASSWORD = process.env.DEVELOPER_PASSWORD || "CHANGE_ME";

async function setupDeveloper() {
  let client;
  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();

    console.log("\n=== CLEARING DATABASE ===");

    const collections = [
      "users",
      "scoutprofiles",
      "posts",
      "announcements",
      "attendancesessions",
      "attendancerecords",
    ];

    for (const collectionName of collections) {
      const result = await db.collection(collectionName).deleteMany({});
      console.log(`Cleared ${collectionName}: ${result.deletedCount} documents`);
    }

    console.log("\n=== CREATING DEVELOPER ACCOUNT ===");

    const developerUserId = randomUUID();
    await db.collection("users").insertOne({
      id: developerUserId,
      firstName: "Developer",
      lastName: "User",
      email: "developer@scout.org",
      password: DEVELOPER_PASSWORD,
      phone: "0000000000",
      section: "كشافة",
      team: "A",
      status: "approved",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Created developer user:", developerUserId, "developer@scout.org");

    await db.collection("scoutprofiles").insertOne({
      id: randomUUID(),
      userId: developerUserId,
      role: "developer",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Created developer profile with role: developer");

    console.log("\n=== SETUP COMPLETE ===");
    console.log("Developer account credentials:");
    console.log("Email: developer@scout.org");
    console.log("Set DEVELOPER_PASSWORD env var to the password you used");
    console.log("Role: developer");

  } catch (error) {
    console.error("Error setting up developer account:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("\nDisconnected from MongoDB");
    }
  }
}

setupDeveloper();
