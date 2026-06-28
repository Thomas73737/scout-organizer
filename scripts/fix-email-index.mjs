import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function fixEmailIndex() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Check existing indexes
    console.log("\nCurrent indexes on users collection:");
    const indexes = await usersCollection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Drop the existing email_1 index if it exists and is not sparse
    const emailIndex = indexes.find((idx) => idx.key?.email === 1);
    if (emailIndex && !emailIndex.sparse) {
      console.log("\nDropping non-sparse email index...");
      await usersCollection.dropIndex("email_1");
      console.log("Email index dropped successfully");
    }

    // Recreate the index with sparse option
    console.log("\nCreating sparse unique index on email field...");
    await usersCollection.createIndex(
      { email: 1 },
      { 
        unique: true, 
        sparse: true,
        name: "email_1"
      }
    );
    console.log("Sparse email index created successfully");

    // Verify the fix
    console.log("\nUpdated indexes on users collection:");
    const updatedIndexes = await usersCollection.indexes();
    console.log(JSON.stringify(updatedIndexes, null, 2));

    console.log("\n✅ Email index fixed successfully!");
    console.log("You can now create multiple users with null email values.");

  } catch (error) {
    console.error("Error fixing email index:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

fixEmailIndex();
