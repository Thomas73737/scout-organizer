/**
 * Vercel Function entry point for the /api route.
 *
 * Vercel serves the built frontend straight from the CDN (see `outputDirectory`
 * in vercel.json), so this function only handles the API. The Express app is
 * created with `serveStatic: false` to avoid pulling the multi-megabyte static
 * bundle into the function.
 *
 * Requests to /api/<anything> are rewritten to this function by vercel.json,
 * which leaves the original path intact on the request, so the router mounted at
 * "/api" inside the app still resolves the full sub-path.
 */
import app from "../artifacts/api-server/src/vercel";

export default app;
