#!/usr/bin/env node
/**
 * Runs electron-builder for Windows with a fresh timestamped output directory
 * under release/ (see release-output-dir.mjs).
 *
 * Extra CLI args are forwarded (e.g. --dir).
 */
import { spawn } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { getReleaseOutputSubpath } from "./release-output-dir.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(__dirname, "..");
const outDir = getReleaseOutputSubpath();
const extra = process.argv.slice(2);
const args = [
  "electron-builder",
  "--win",
  "--config",
  "electron-builder.yml",
  `--config.directories.output=${outDir}`,
  ...extra,
];
console.log(`[electron-pack-win] Output: ${outDir}\n`);
const proc = spawn("yarn", args, { cwd: webDir, stdio: "inherit", shell: true });
proc.on("exit", (code) => process.exit(code ?? 1));
