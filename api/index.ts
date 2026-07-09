import { connectDB } from "@workspace/db";
import app from "../artifacts/api-server/src/app";

let initialized = false;

async function ensureConnection() {
  if (!initialized) {
    await connectDB();
    initialized = true;
  }
}

export default async function handler(req: any, res: any) {
  try {
    await ensureConnection();
    app(req, res);
  } catch (err) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Service unavailable: database connection failed" }));
  }
}
