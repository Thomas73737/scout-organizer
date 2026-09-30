import { createApiApp } from "./app";

/**
 * Serverless entry point for Vercel.
 *
 * Unlike src/index.ts, this never calls app.listen() and never requires PORT:
 * the platform owns the HTTP server and passes the request in. Static assets
 * are excluded because Vercel serves them from the CDN via `outputDirectory`.
 */
const app = createApiApp({ serveStatic: false });

export default app;
