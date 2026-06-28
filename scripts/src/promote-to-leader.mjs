import { MongoClient } from 'mongodb';

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

async function promoteToLeader() {
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db();
    const usersCollection = db.collection('users');
    const scoutProfilesCollection = db.collection('scoutprofiles');
    
    // Get email from command line or environment
    const email = process.argv[2] || process.env.ADMIN_EMAIL;
    
    if (!email) {
      console.error("Please provide an email address as argument or ADMIN_EMAIL environment variable");
      console.log("Usage: ADMIN_EMAIL=user@example.com pnpm --filter @workspace/scripts run promote-to-leader");
      console.log("Or: pnpm --filter @workspace/scripts run promote-to-leader user@example.com");
      process.exit(1);
    }
    
    console.log(`Looking for user with email: ${email}`);
    
    // Find user by email
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      console.error("User not found with email:", email);
      console.log("\nUser must first log in through the website to be created in the database.");
      console.log("Steps:");
      console.log("1. Open http://localhost:3000 in your browser");
      console.log("2. Log in with your preferred authentication method");
      console.log("3. After successful login, run this script again with your email");
      console.log("\nUsage: DATABASE_URL=\"mongodb://localhost:27017/scout-organizer\" pnpm --filter @workspace/scripts run promote-to-leader your-email@example.com");
      process.exit(1);
    }
    
    console.log("Found user:", user.email, "ID:", user.id);
    
    // Check if they already have a profile
    const existingProfile = await scoutProfilesCollection.findOne({ userId: user.id });
    
    if (existingProfile) {
      if (existingProfile.role === "leader") {
        console.log("User already has leader role");
        process.exit(0);
      }
      
      // Update to leader role
      await scoutProfilesCollection.updateOne(
        { _id: existingProfile._id },
        { $set: { role: "leader", updatedAt: new Date() } }
      );
      console.log("Updated user to leader role");
    } else {
      // Create new leader profile
      const { randomUUID } = await import('crypto');
      await scoutProfilesCollection.insertOne({
        id: randomUUID(),
        userId: user.id,
        role: "leader",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("Created leader profile for user");
    }
    
    console.log("\n✅ User successfully promoted to leader role!");
    console.log("Email:", email);
    console.log("User ID:", user.id);
    console.log("Role: leader");
    console.log("\nYou can now access admin features at http://localhost:3000");
    
  } catch (error) {
    console.error("Error promoting user to leader:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

promoteToLeader();