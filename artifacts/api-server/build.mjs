import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(artifactDir, "../..");

const isVercel = !!process.env.VERCEL;

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  if (isVercel) {
    const apiDir = path.resolve(projectRoot, "api");
    try { await rm(path.resolve(apiDir, "index.mjs")); } catch {}
    try { await rm(path.resolve(apiDir, "index.js")); } catch {}
  }

  const commonOpts = {
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    logLevel: "info",
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
      "mongoose",
      "mongodb",
    ],
    sourcemap: false,
    plugins: [],
  };

  if (isVercel) {
    await esbuild({
      ...commonOpts,
      format: "cjs",
      outfile: path.resolve(projectRoot, "api/index.js"),
    });
  } else {
    await esbuild({
      ...commonOpts,
      format: "esm",
      outdir: distDir,
      outExtension: { ".js": ".mjs" },
      banner: {
        js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
      },
    });
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
