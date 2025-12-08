#!/usr/bin/env node
/**
 * Build Release Script
 * 
 * This script orchestrates the full build process for Third Space Vest:
 * 1. Build the Python daemon with PyInstaller (vest-daemon.exe)
 * 2. Build the React app with Vite
 * 3. Package everything with electron-builder
 * 
 * Usage:
 *   node scripts/build-release.mjs [options]
 * 
 * Options:
 *   --skip-daemon    Skip building the daemon (use existing)
 *   --skip-renderer  Skip building the renderer (use existing)
 *   --dir            Build unpacked directory (faster, for testing)
 * 
 * Output:
 *   release/Third Space Vest Setup 1.0.0.exe (installer)
 *   release/Third Space Vest-1.0.0-portable.zip (portable)
 */

import { spawn } from "child_process";
import { existsSync, mkdirSync, copyFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const WEB_DIR = resolve(__dirname, "..");
const PROJECT_ROOT = resolve(WEB_DIR, "..");
const DAEMON_BUILD_DIR = resolve(PROJECT_ROOT, "modern-third-space", "build");
const DAEMON_DIST_DIR = resolve(DAEMON_BUILD_DIR, "dist");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log();
  log(`${"=".repeat(60)}`, colors.cyan);
  log(`  Step ${step}: ${message}`, colors.bright);
  log(`${"=".repeat(60)}`, colors.cyan);
  console.log();
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

/**
 * Run a command and return a promise.
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(" ")}`, colors.cyan);
    
    const proc = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Build the Python daemon with PyInstaller.
 */
async function buildDaemon() {
  logStep(1, "Building Python Daemon");
  
  const pythonCmd = process.platform === "win32" ? "python" : "python3";
  
  // Run the daemon build script
  await runCommand(pythonCmd, [resolve(DAEMON_BUILD_DIR, "build-daemon.py")], {
    cwd: DAEMON_BUILD_DIR,
  });
  
  // Verify output
  const daemonExe = resolve(DAEMON_DIST_DIR, 
    process.platform === "win32" ? "vest-daemon.exe" : "vest-daemon"
  );
  
  if (!existsSync(daemonExe)) {
    throw new Error(`Daemon executable not found: ${daemonExe}`);
  }
  
  logSuccess(`Daemon built: ${daemonExe}`);
  return daemonExe;
}

/**
 * Build the React renderer with Vite.
 */
async function buildRenderer() {
  logStep(2, "Building React Renderer");
  
  await runCommand("yarn", ["build"], {
    cwd: WEB_DIR,
  });
  
  const distDir = resolve(WEB_DIR, "dist");
  if (!existsSync(distDir)) {
    throw new Error(`Renderer build not found: ${distDir}`);
  }
  
  logSuccess("Renderer built successfully");
}

/**
 * Package with electron-builder.
 */
async function packageElectron(dirOnly = false) {
  logStep(3, "Packaging with Electron Builder");
  
  const args = ["electron-builder", "--win", "--config", "electron-builder.yml"];
  if (dirOnly) {
    args.push("--dir");
  }
  
  await runCommand("yarn", args, {
    cwd: WEB_DIR,
  });
  
  logSuccess("Electron app packaged successfully");
}

/**
 * Main build function.
 */
async function main() {
  const args = process.argv.slice(2);
  const skipDaemon = args.includes("--skip-daemon");
  const skipRenderer = args.includes("--skip-renderer");
  const dirOnly = args.includes("--dir");
  
  console.log();
  log("╔════════════════════════════════════════════════════════════╗", colors.bright);
  log("║         Third Space Vest - Release Builder                 ║", colors.bright);
  log("╚════════════════════════════════════════════════════════════╝", colors.bright);
  console.log();
  
  log(`Platform: ${process.platform}`, colors.cyan);
  log(`Project Root: ${PROJECT_ROOT}`, colors.cyan);
  log(`Skip Daemon: ${skipDaemon}`, colors.cyan);
  log(`Skip Renderer: ${skipRenderer}`, colors.cyan);
  log(`Directory Only: ${dirOnly}`, colors.cyan);
  
  try {
    // Step 1: Build daemon
    if (!skipDaemon) {
      await buildDaemon();
    } else {
      logWarning("Skipping daemon build (--skip-daemon)");
    }
    
    // Step 2: Build renderer
    if (!skipRenderer) {
      await buildRenderer();
    } else {
      logWarning("Skipping renderer build (--skip-renderer)");
    }
    
    // Step 3: Package with electron-builder
    await packageElectron(dirOnly);
    
    // Done!
    console.log();
    log("╔════════════════════════════════════════════════════════════╗", colors.green);
    log("║                    BUILD SUCCESSFUL!                       ║", colors.green);
    log("╚════════════════════════════════════════════════════════════╝", colors.green);
    console.log();
    
    const releaseDir = resolve(WEB_DIR, "release");
    log(`Output: ${releaseDir}`, colors.bright);
    console.log();
    
  } catch (err) {
    console.log();
    logError(`Build failed: ${err.message}`);
    process.exit(1);
  }
}

main();
