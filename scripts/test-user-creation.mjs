import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function testUserCreation() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Test creating multiple users without email
    console.log("\nTest 1: Creating first user without email...");
    const user1Id = randomUUID();
    await usersCollection.insertOne({
      id: user1Id,
      firstName: "Test",
      lastName: "User1",
      phone: "1111111111111",
      team: "TestTeam",
    });
    console.log("✅ First user created successfully");

    console.log("\nTest 2: Creating second user without email...");
    const user2Id = randomUUID();
    await usersCollection.insertOne({
      id: user2Id,
      firstName: "Test",
      lastName: "User2",
      phone: "2222222222222",
      team: "TestTeam",
    });
    console.log("✅ Second user created successfully");

    console.log("\nTest 3: Creating third user without email...");
    const user3Id = randomUUID();
    await usersCollection.insertOne({
      id: user3Id,
      firstName: "Test",
      lastName: "User3",
      phone: "3333333333333",
      team: "TestTeam",
    });
    console.log("✅ Third user created successfully");

    console.log("\n✅ All tests passed! Multiple users can be created without email.");

    // Clean up test users
    console.log("\nCleaning up test users...");
    await usersCollection.deleteMany({ phone: { $in: ["1111111111111", "2222222222222", "3333333333333"] } });
    console.log("✅ Test users deleted");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testUserCreation();
