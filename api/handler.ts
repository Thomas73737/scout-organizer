import app from "../artifacts/api-server/src/app";

export default async function handler(req: any, res: any) {
  return new Promise<void>((resolve, reject) => {
    try {
      app(req, res);

      res.on("finish", () => resolve());
      res.on("close", () => resolve());
      res.on("error", (err: Error) => {
        if (!res.headersSent) {
          reject(err);
        } else {
          resolve();
        }
      });
    } catch (err) {
      if (!res.headersSent) {
        res.statusCode = 503;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Service unavailable" }));
      }
      resolve();
    }
  });
}
