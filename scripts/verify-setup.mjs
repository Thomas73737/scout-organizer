import { MongoClient } from "mongodb";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

async function verifySetup() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection("users");
    const profilesCollection = db.collection("scoutprofiles");

    // Check admin user
    const adminUser = await usersCollection.findOne({ email: ADMIN_EMAIL });
    
    if (!adminUser) {
      console.log("❌ Admin user not found");
      return;
    }

    console.log("✅ Admin user found:");
    console.log("   Email:", adminUser.email);
    console.log("   Password:", adminUser.password);
    console.log("   Section:", adminUser.section);
    console.log("   Team:", adminUser.team);
    console.log("   Status:", adminUser.status);

    // Check admin profile
    const adminProfile = await profilesCollection.findOne({ userId: adminUser.id });
    
    if (!adminProfile) {
      console.log("❌ Admin profile not found");
      return;
    }

    console.log("✅ Admin profile found:");
    console.log("   Role:", adminProfile.role);

    // Check all users
    const allUsers = await usersCollection.find({}).toArray();
    console.log(`\nTotal users in database: ${allUsers.length}`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.section} - ${user.team} - Status: ${user.status}`);
    });

    console.log("\n✅ Setup verification complete!");

  } catch (error) {
    console.error("Error verifying setup:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

verifySetup();