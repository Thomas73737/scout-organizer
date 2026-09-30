/**
 * Bundles the api-server into a single self-contained ES module for the Vercel
 * Function entry point.
 *
 * Why this exists
 * ---------------
 * Vercel builds each serverless file on its own and leaves relative import
 * specifiers exactly as written. Because the api-server sources are ES modules
 * (artifacts/api-server/package.json sets "type": "module") while the root
 * package.json declares no "type", Node's ESM resolver executes those
 * extensionless specifiers verbatim and every relative import fails:
 *
 *   Error [ERR_MODULE_NOT_FOUND]: Cannot find module
 *   '/var/task/artifacts/api-server/src/app' imported from
 *   /var/task/artifacts/api-server/src/vercel.js
 *
 * Rewriting every relative import in the workspace to carry a ".js" extension
 * would be a huge, invasive change. Instead we pre-bundle, so the function only
 * ever loads one file that contains no relative imports at all.
 *
 * The external list and the CJS banner deliberately mirror
 * artifacts/api-server/build.mjs, which already bundles this same entry point
 * for the local/standalone server.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiServerDir = path.join(repoRoot, "artifacts", "api-server");
const entryPoint = path.join(apiServerDir, "src", "vercel.ts");
const outfile = path.join(repoRoot, "api", "_app.mjs");

// esbuild is installed in the api-server workspace, not the repo root, so
// resolve it from there. This keeps the root package.json and lockfile
// untouched.
const require = createRequire(path.join(apiServerDir, "package.json"));
const { build } = await import(require.resolve("esbuild"));

const result = await build({
  entryPoints: [entryPoint],
  outfile,
  platform: "node",
  bundle: true,
  format: "esm",
  target: "node20",
  minify: false,
  sourcemap: false,
  legalComments: "none",
  logLevel: "warning",
  metafile: true,
  // pino-pretty is a pino transport resolved at runtime from a string, so
  // esbuild cannot see it. It is only ever referenced on the non-production
  // branch of artifacts/api-server/src/lib/logger.ts, so leaving it external is
  // safe on Vercel. Native .node addons cannot be bundled at all.
  external: ["pino-pretty", "*.node"],
  // The bundle is ESM, but the CommonJS dependencies it pulls in (express,
  // cookie-parser, cors, xlsx, ...) expect a real `require`, plus the
  // __filename/__dirname globals some of them read. Without this Node throws
  // ERR_REQUIRE_ESM. Same banner as artifacts/api-server/build.mjs.
  banner: {
    js: `import { createRequire as __vcCrReq } from 'node:module';
import __vcPath from 'node:path';
import __vcUrl from 'node:url';

globalThis.require = __vcCrReq(import.meta.url);
globalThis.__filename = __vcUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __vcPath.dirname(globalThis.__filename);
`,
  },
});

const sizeMb = (Object.values(result.metafile.outputs)[0].bytes / 1024 / 1024).toFixed(2);
process.stdout.write(
  `Built ${path.relative(repoRoot, outfile)} (${sizeMb} MB) from ${path.relative(repoRoot, entryPoint)}\n`,
);
