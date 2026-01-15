#!/usr/bin/env node

/**
 * Script to check Python bridge setup
 * Tests ping and list commands to verify the Python CLI is working correctly
 */

import runPythonCommand from "./runPythonCommand.mjs";
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

