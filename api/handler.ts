import express from "express";

const app = express();
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.get("*", (_req, res) => {
  res.json({ message: "Vercel function is running" });
});

export default async function handler(req: any, res: any) {
  return new Promise<void>((resolve) => {
    app(req, res);
    res.on("finish", () => resolve());
    res.on("close", () => resolve());
  });
}
