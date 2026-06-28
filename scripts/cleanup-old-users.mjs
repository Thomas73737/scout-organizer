import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function cleanupOldUsers() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");
    const accessRequestsCollection = db.collection("accessrequests");

    // Get all users
    const allUsers = await usersCollection.find({}).toArray();
    console.log(`Found ${allUsers.length} users in database`);

    // Delete users that don't have email and password (old schema)
    const deleteResult = await usersCollection.deleteMany({
      $or: [
        { email: { $exists: false } },
        { password: { $exists: false } }
      ]
    });

    console.log(`Deleted ${deleteResult.deletedCount} old schema users`);

    // Clean up access requests that don't match new schema
    const deleteRequests = await accessRequestsCollection.deleteMany({
      $or: [
        { email: { $exists: false } },
        { password: { $exists: false } },
        { section: { $exists: false } }
      ]
    });

    console.log(`Deleted ${deleteRequests.deletedCount} old schema access requests`);

    // Verify remaining users
    const remainingUsers = await usersCollection.find({}).toArray();
    console.log(`\nRemaining users (${remainingUsers.length}):`);
    remainingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} - ${user.email} - Section: ${user.section} - Team: ${user.team} - Status: ${user.status}`);
    });

  } catch (error) {
    console.error("Error cleaning up old users:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

cleanupOldUsers();