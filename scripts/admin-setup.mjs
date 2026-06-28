import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";

// Define simple schemas inline
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  firstName: String,
  lastName: String,
  phone: String,
  team: String,
  profileImageUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const scoutProfileSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  userId: { type: String, required: true, unique: true },
  role: { type: String, default: "scout", enum: ["scout", "leader"] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

async function setupAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(DATABASE_URL);
    console.log("Connected to MongoDB");
    
    const UserModel = mongoose.model('User', userSchema);
    const ScoutProfileModel = mongoose.model('ScoutProfile', scoutProfileSchema);
    
    // Get email from command line or environment
    const email = process.argv[2] || process.env.ADMIN_EMAIL || "admin@scout-organizer.com";
    
    console.log(`Looking for user with email: ${email}`);
    
    // Find user by email
    const user = await UserModel.findOne({ email });
    
    if (!user) {
      console.error("User not found with email:", email);
      console.log("\nUser must first log in through the website to be created in the database.");
      console.log("Steps:");
      console.log("1. Open http://localhost:3000 in your browser");
      console.log("2. Log in with your preferred authentication method");
      console.log("3. After successful login, run this script again with your email");
      console.log("\nUsage: DATABASE_URL=\"mongodb://localhost:27017/scout-organizer\" node scripts/admin-setup.mjs your-email@example.com");
      process.exit(1);
    }
    
    console.log("Found user:", user.email, "ID:", user.id);
    
    // Check if they already have a profile
    const existingProfile = await ScoutProfileModel.findOne({ userId: user.id });
    
    if (existingProfile) {
      if (existingProfile.role === "leader") {
        console.log("User already has leader role");
        process.exit(0);
      }
      
      // Update to leader role
      existingProfile.role = "leader";
      existingProfile.updatedAt = new Date();
      await existingProfile.save();
      console.log("Updated user to leader role");
    } else {
      // Create new leader profile
      await ScoutProfileModel.create({
        id: randomUUID(),
        userId: user.id,
        role: "leader",
      });
      console.log("Created leader profile for user");
    }
    
    console.log("\n✅ User successfully promoted to leader role!");
    console.log("Email:", email);
    console.log("User ID:", user.id);
    console.log("Role: leader");
    console.log("\nYou can now access admin features at http://localhost:3000");
    
  } catch (error) {
    console.error("Error setting up admin:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

setupAdmin();