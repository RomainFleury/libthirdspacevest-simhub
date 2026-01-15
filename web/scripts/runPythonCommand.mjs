#!/usr/bin/env node

/**
 * Helper module to run Python CLI commands with proper Python detection.
 * 
 * Python Resolution Order:
 * 1. TSV_PYTHON environment variable (e.g., "py -3.14" or "C:\Python314\python.exe")
 * 2. On Windows: py launcher with Python 3.14 (py -3.14)
 * 3. Fallback: python (Windows) or python3 (Unix)
 * 
 * This matches the logic in windows/*.bat scripts and daemonBridge.cjs for consistency.
 */

import { spawn, execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the modern-third-space src directory (for PYTHONPATH)
const PYTHON_SRC_PATH = resolve(
  __dirname,
  "..",
  "..",
  "modern-third-space",
  "src"
);

/**
 * Detect the best Python command to use.
 * @returns {{ cmd: string, args: string[] }} Command and initial args to spawn Python
 */
function detectPythonCommand() {
  // 1. Check TSV_PYTHON environment variable
  const tsvPython = process.env.TSV_PYTHON;
  if (tsvPython) {
    const parts = tsvPython.trim().split(/\s+/);
    console.log(`[python] Using TSV_PYTHON: ${tsvPython}`);
    return { cmd: parts[0], args: parts.slice(1) };
  }

  // 2. On Windows, try py launcher with Python 3.14
  if (process.platform === "win32") {
    try {
      execSync('py -3.14 -c "import sys"', { stdio: "ignore", timeout: 5000 });
      console.log("[python] Using: py -3.14 (detected via py launcher)");
      return { cmd: "py", args: ["-3.14"] };
    } catch (e) {
      // py -3.14 not available, fall through
    }
  }

  // 3. Fallback to python/python3
  const fallback = process.platform === "win32" ? "python" : "python3";
  console.log(`[python] Using: ${fallback} (default fallback)`);
  return { cmd: fallback, args: [] };
}

export default function runPythonCommand(command, args = []) {
  return new Promise((resolvePromise, reject) => {
    try {
      // Detect Python command
      const pythonInfo = detectPythonCommand();
      
      // Run as module: python -m modern_third_space.cli <command> <args>
      const pythonArgs = [
        ...pythonInfo.args,  // e.g., ["-3.14"] for py launcher
        "-u", // unbuffered output
        "-m",
        "modern_third_space.cli",
        command,
        ...args,
      ];

      const pythonProcess = spawn(pythonInfo.cmd, pythonArgs, {
        cwd: PYTHON_SRC_PATH,
        env: {
          ...process.env,
          PYTHONPATH: PYTHON_SRC_PATH,
        },
      });

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      pythonProcess.on("close", (code) => {
        const output = stdout.trim();

        if (code !== 0) {
          // Prioritize stderr for error messages
          const errorMsg = stderr || stdout || `Process exited with code ${code}`;
          reject(new Error(`Python CLI error: ${errorMsg}`));
          return;
        }

        if (!output) {
          reject(new Error("Python CLI returned empty output"));
          return;
        }

        try {
          const parsed = JSON.parse(output);
          resolvePromise(parsed);
        } catch (parseError) {
          if(output.includes("[OK] Daemon stopped") || output.includes("[ERROR] Daemon is not running")) {
            resolvePromise({ status: "ok", message: "Daemon stopped successfully" });
            return;
          }
          // If JSON parsing fails, the output might be an error message
          reject(
            new Error(
              `Failed to parse Python output as JSON: ${
                parseError.message
              }. Output: ${output.substring(0, 200)}`
            )
          );
        }
      });

      pythonProcess.on("error", (err) => {
        // This handles errors like 'command not found'
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });
    } catch (setupError) {
      // Catch any errors in setting up the spawn call
      reject(
        new Error(`Failed to setup Python command: ${setupError.message}`)
      );
    }
  });
}