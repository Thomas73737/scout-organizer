import app from "./app";

export default async function handler(req: any, res: any) {
  return new Promise<void>((resolve) => {
    app(req, res);
    res.on("finish", () => resolve());
    res.on("close", () => resolve());
  });
}
