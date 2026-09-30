import type { IncomingMessage, ServerResponse } from "node:http";
import express, { type Express } from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

/**
 * Build the Express application.
 *
 * `serveStatic` is enabled for the long-running Node server, which hosts both
 * the API and the built SPA from a single process. Serverless deployments set
 * it to false: there the static assets are served straight from the CDN via
 * `outputDirectory`, and serving them from a function would mean bundling and
 * streaming the whole frontend (including multi-MB videos) on every request.
 */
export function createApiApp(
  { serveStatic = true }: { serveStatic?: boolean } = {},
): Express {
  const app: Express = express();

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req: IncomingMessage) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res: ServerResponse) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
  app.use(cors({ credentials: true, origin: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(authMiddleware);

  app.use("/api", router);

  if (serveStatic) {
    // Serve static frontend files from the Vite build output
    const clientDistPath = path.resolve(__dirname, "../../..", "dist");
    app.use(express.static(clientDistPath));

    // SPA fallback: serve index.html for all non-API, non-static routes
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  // Global error-handling middleware — must have 4 parameters for Express to
  // treat it as an error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error({ err }, "Unhandled error");
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  return app;
}

export default createApiApp({ serveStatic: true });
