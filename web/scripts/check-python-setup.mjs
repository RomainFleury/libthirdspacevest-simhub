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

/**
 * Execute a Python CLI command and return parsed JSON result
 */
function runPythonCommand(command, args = []) {
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

/**
 * Format device list for display
 */
function formatDeviceList(devices) {
  if (!Array.isArray(devices) || devices.length === 0) {
    return "  (no devices found)";
  }

  return devices
    .map((device, index) => {
      const isFake = device.serial_number === "sorry-bro";
      const indicator = isFake ? "⚠️  " : "✓  ";
      return `  ${indicator}Device ${index + 1}:
    Vendor ID: ${device.vendor_id}
    Product ID: ${device.product_id}
    Bus: ${device.bus}
    Address: ${device.address}
    Serial: ${device.serial_number || "(none)"}
    ${isFake ? "\n    ⚠️  This is a fake device - PyUSB is not installed!" : ""}`;
    })
    .join("\n\n");
}

/**
 * Main function
 */
async function main() {
  console.log("🔍 Checking Python bridge setup...\n");
  console.log(`Python path: ${PYTHON_SRC_PATH}\n`);

  // Test 1: Ping command
  console.log("1️⃣  Testing 'ping' command...");
  try {
    const pingResult = await runPythonCommand("ping");
    if (pingResult.status === "ok") {
      console.log("   ✅ Ping successful!");
      console.log(`   Message: ${pingResult.message}\n`);
    } else {
      console.log("   ❌ Ping failed:", pingResult);
      console.log();
    }
  } catch (error) {
    console.log("   ❌ Ping failed with error:");
    console.log(`   ${error.message}\n`);
  }

  // Test 2: List devices
  console.log("2️⃣  Testing 'list' command...");
  try {
    const devices = await runPythonCommand("list");
    console.log("   ✅ List command successful!");
    console.log(`   Found ${devices.length} device(s):\n`);
    console.log(formatDeviceList(devices));
    console.log();

    // Check if PyUSB is available
    const hasFakeDevice = devices.some(
      (d) => d.serial_number === "sorry-bro"
    );
    if (hasFakeDevice) {
      console.log("⚠️  WARNING: PyUSB is not installed!");
      console.log("   Install it with: pip install pyusb");
      console.log("   See modern-third-space/README.md for platform-specific instructions.\n");
    } else if (devices.length === 0) {
      console.log("ℹ️  No USB vest devices detected (this is normal if no device is connected).\n");
    } else {
      console.log("✅ USB devices detected! PyUSB is working correctly.\n");
    }
  } catch (error) {
    console.log("   ❌ List command failed with error:");
    console.log(`   ${error.message}\n`);
  }

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Setup check complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

