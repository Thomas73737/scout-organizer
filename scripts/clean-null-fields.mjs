import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function cleanNullFields() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find all users and clean up null fields
    const allUsers = await usersCollection.find({}).toArray();
    
    console.log(`\nFound ${allUsers.length} users to clean up.`);
    
    for (const user of allUsers) {
      const updates = {};
      
      if (user.email === null) {
        updates.email = "";
      }
      if (user.profileImageUrl === null) {
        updates.profileImageUrl = "";
      }
      if (user.lastName === null) {
        updates.lastName = "";
      }
      
      if (Object.keys(updates).length > 0) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $unset: updates }
        );
        console.log(`✅ Updated user ${user.id}: removed ${Object.keys(updates).join(", ")} fields`);
      }
    }
    
    console.log("\n✅ Null field cleanup complete");

    // Show final structure
    const finalUsers = await usersCollection.find({}).toArray();
    console.log("\nFinal user structure:");
    for (const user of finalUsers) {
      console.log(`User ${user.id}:`, JSON.stringify(user, null, 2));
    }

  } catch (error) {
    console.error("Error cleaning null fields:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

cleanNullFields();
