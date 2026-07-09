import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

globalThis.require = createRequire(import.meta.url);

const rootDir = path.resolve(fileURLToPath(import.meta.url), "../..");

async function buildHandler() {
  await esbuild({
    entryPoints: [path.resolve(rootDir, "api/handler.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: path.resolve(rootDir, "api/index.mjs"),
    logLevel: "info",
    external: [
      "*.node",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
    ],
    sourcemap: false,
  });
}

buildHandler().catch((err) => {
  console.error(err);
  process.exit(1);
});
