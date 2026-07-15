import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  try {
    // On Vercel, VERCEL=1 is set and build.mjs overwrites this file entirely
    // with the bundled server. This wrapper only runs if the full bundle isn't present.
    const distPath = path.resolve(__dirname, "../artifacts/api-server/dist/index.mjs");
    const { default: app } = await import(distPath);
    app(req, res);
  } catch (err) {
    console.error("Handler error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err?.message || "Internal error" }));
  }
}
