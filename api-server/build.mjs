import path from "node:path";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

// Railway reliably sets CWD to the service root
const rootDir = process.cwd();

async function buildAll() {
  const distDir = path.resolve(rootDir, "dist");

  // Clean output
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(rootDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",

    // ✅ Single explicit output file (Railway-friendly)
    outfile: path.resolve(distDir, "index.mjs"),

    logLevel: "info",
    sourcemap: "linked",

    // Native / dynamic modules that must not be bundled
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
      "bufferutil",
      "utf-8-validate",
      "pg-native",
      "@prisma/client",
      "@aws-sdk/*",
      "@google-cloud/*",
      "firebase-admin",
      "@sentry/profiling-node",
      "playwright",
      "puppeteer",
      "electron"
    ],

    plugins: [
      esbuildPluginPino({
        transports: ["pino-pretty"]
      })
    ],

    // ✅ Correct ESM globals for Node + Express + Socket.IO
    banner: {
      js: `
        import { createRequire as __require } from 'node:module';
        import { fileURLToPath as __fileURLToPath } from 'node:url';
        import { dirname as __dirnameFn } from 'node:path';

        const require = __require(import.meta.url);
        const __filename = __fileURLToPath(import.meta.url);
        const __dirname = __dirnameFn(__filename);

        globalThis.require = require;
        globalThis.__filename = __filename;
        globalThis.__dirname = __dirname;
      `
    }
  });
}

buildAll().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
``
