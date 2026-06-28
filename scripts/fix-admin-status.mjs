import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function fixAdminStatus() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Fix admin user status
    const result = await usersCollection.updateOne(
      { phone: "1234567891011" },
      { $set: { status: "approved", updatedAt: new Date() } }
    );

    if (result.matchedCount > 0) {
      console.log("✅ Admin user status updated to 'approved'");
    } else {
      console.log("❌ Admin user not found");
    }

    // Verify the update
    const adminUser = await usersCollection.findOne({ phone: "1234567891011" });
    console.log("\nUpdated admin user:", JSON.stringify(adminUser, null, 2));

  } catch (error) {
    console.error("Error fixing admin status:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

fixAdminStatus();