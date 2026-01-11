#!/usr/bin/env node

/**
 * Script to check Python bridge setup
 * Tests ping and list commands to verify the Python CLI is working correctly
 */

import { spawn } from "child_process";
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

export default function runPythonCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    try {
      // Run as module: python3 -m modern_third_space.cli <command> <args>
      const pythonArgs = [
        "-u", // unbuffered output
        "-m",
        "modern_third_space.cli",
        command,
        ...args,
      ];

      const pythonProcess = spawn("python3", pythonArgs, {
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
          resolve(parsed);
        } catch (parseError) {
          if(output.includes("[OK] Daemon stopped") || output.includes("[ERROR] Daemon is not running")) {
            resolve({ status: "ok", message: "Daemon stopped successfully" });
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