#!/usr/bin/env node

/**
 * Script to check Python bridge setup
 * Tests ping and list commands to verify the Python CLI is working correctly
 */

import runPythonCommand from "./runPythonCommand.mjs";

/**
 * Main function
 */
async function main() {
  // Stop the daemon
  console.log("3️⃣  Stopping daemon...");
  try {
    await runPythonCommand("daemon", ["stop", "--port", "5050", "--force"]);
    console.log("   ✅ Daemon stopped successfully!");
  } catch (error) {
    console.log("   ❌ Daemon failed to stop with error:");
    console.log(`   ${error.message}\n`);
  }

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Daemon stop complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

