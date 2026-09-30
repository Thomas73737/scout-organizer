import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";

/**
 * Vercel Function entry point for the /api route.
 *
 * Vercel serves the built frontend straight from the CDN (see `outputDirectory`
 * in vercel.json), so this function only handles the API. The Express app is
 * created with `serveStatic: false` to avoid pulling the multi-megabyte static
 * bundle into the function.
 *
 * Requests to /api/<anything> are rewritten here by vercel.json, which leaves
 * the original path on the request, so the router mounted at "/api" inside the
 * app still resolves the full sub-path.
 *
 * The app is loaded with a dynamic import() of ./_app.mjs, a single bundled
 * file produced by scripts/build-vercel-api.mjs during the build command.
 * Two separate problems force this shape:
 *
 * 1. Vercel compiles this file to CommonJS (the repo root package.json declares
 *    no "type": "module") while the api-server sources are ES modules, because
 *    artifacts/api-server/package.json sets "type": "module". A static import
 *    therefore compiles to require() and dies with ERR_REQUIRE_ESM. Dynamic
 *    import() is valid from both module systems, so it works either way.
 *
 * 2. Vercel builds each serverless file on its own and leaves relative import
 *    specifiers exactly as written, so Node's ESM resolver then fails on every
 *    extensionless one with ERR_MODULE_NOT_FOUND. Bundling collapses the whole
 *    import graph into one file with no relative imports left to resolve.
 *
 * The promise is cached so the module is only evaluated once per warm instance.
 */
let appPromise: Promise<RequestListener> | null = null;

function getApp(): Promise<RequestListener> {
  appPromise ??= import("./_app.mjs").then((module) => module.default);
  return appPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<unknown> {
  const app = await getApp();
  return app(req, res);
}
