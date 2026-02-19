import { context, build as esbuildBuild } from "esbuild";
import chokidar from "chokidar";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const isWatch = process.argv.includes("--watch");
const rootDir = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(rootDir, "..");
const outDir = path.join(projectRoot, "dist");
const staticDir = path.join(projectRoot, "static");

async function ensureOutDir() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
}

async function copyStaticAssets() {
  await cp(staticDir, outDir, { recursive: true });
  console.log("[copy] static assets synced to dist");
}

function watchStaticAssets() {
  const watcher = chokidar.watch(staticDir, { ignoreInitial: true });
  watcher.on("all", async () => {
    try {
      await copyStaticAssets();
    } catch (error) {
      console.error("[copy] failed", error);
    }
  });
}

const entryPoints = {
  background: path.join(projectRoot, "src/background/index.ts"),
  popup: path.join(projectRoot, "src/popup/main.ts"),
  options: path.join(projectRoot, "src/options/main.ts"),
};

const buildOptions = {
  entryPoints,
  bundle: true,
  format: "esm",
  outdir: outDir,
  entryNames: "[name]",
  sourcemap: true,
  platform: "browser",
  target: ["chrome122"],
  logLevel: "info",
};

async function run() {
  await ensureOutDir();
  await copyStaticAssets();

  if (isWatch) {
    watchStaticAssets();
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log("[esbuild] watching for changes...");
    return;
  }

  await esbuildBuild(buildOptions);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
