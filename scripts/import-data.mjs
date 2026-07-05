import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/scout-organizer";
const backupDir = path.join(projectRoot, "db-backup");

async function importData() {
  let client;
  try {
    client = new MongoClient(DATABASE_URL);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".json") && f !== "_metadata.json");

    for (const file of files) {
      const collectionName = file.replace(".json", "");
      const filePath = path.join(backupDir, file);
      const rawData = fs.readFileSync(filePath, "utf-8");
      const documents = JSON.parse(rawData);

      if (documents.length === 0) {
        console.log(`  - ${collectionName}: empty, skipped`);
        continue;
      }

      // Drop existing collection and re-import
      try {
        await db.collection(collectionName).drop();
      } catch {
        // Collection might not exist
      }

      // Restore ObjectId from string _id
      const { ObjectId } = await import("mongodb");
      const restored = documents.map((doc) => {
        if (doc._id && typeof doc._id === "string") {
          doc._id = new ObjectId(doc._id);
        }
        return doc;
      });

      await db.collection(collectionName).insertMany(restored);
      console.log(`  ✓ ${collectionName}: ${documents.length} documents restored`);
    }

    console.log("\nImport complete!");
    await client.close();
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

importData();
