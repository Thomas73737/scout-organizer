import app from "../artifacts/api-server/src/app";

export default async function handler(req: any, res: any) {
  try {
    app(req, res);
  } catch (err) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Service unavailable" }));
  }
}
