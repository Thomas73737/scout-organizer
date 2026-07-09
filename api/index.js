import app from "../artifacts/api-server/dist/index.mjs";

export default async function handler(req, res) {
  try {
    app(req, res);
  } catch (err) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Service unavailable: database connection failed" }));
  }
}
