module.exports = async function handler(req, res) {
  try {
    const { default: app } = await import("../artifacts/api-server/dist/index.mjs");
    app(req, res);
  } catch (err) {
    console.error("Handler error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err?.message || "Internal error" }));
  }
};
