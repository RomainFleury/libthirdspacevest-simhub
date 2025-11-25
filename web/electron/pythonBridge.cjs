const { PythonShell } = require("python-shell");
const path = require("path");

// Path to the modern-third-space CLI module
const PYTHON_MODULE_PATH = path.resolve(
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
    const options = {
      mode: "json",
      pythonPath: "python3", // or "python" on Windows
      pythonOptions: ["-u"], // unbuffered output
      scriptPath: PYTHON_MODULE_PATH,
      args: [command, ...args],
    };

    PythonShell.run("modern_third_space/cli.py", options, (err, results) => {
      if (err) {
        reject(new Error(`Python error: ${err.message}`));
        return;
      }

      // python-shell returns array of JSON objects
      // For single result commands, take the first item
      const result =
        Array.isArray(results) && results.length > 0 ? results[0] : results;
      resolve(result);
    });
  });
}

/**
 * Get vest connection status
 */
async function getStatus() {
  try {
    const result = await runPythonCommand("status");
    return {
      connected: result?.connected ?? false,
      device_vendor_id: result?.device_vendor_id ?? null,
      device_product_id: result?.device_product_id ?? null,
      last_error: result?.error ?? null,
    };
  } catch (error) {
    return {
      connected: false,
      last_error: error.message,
    };
  }
}

/**
 * Get available effects list
 */
async function getEffects() {
  try {
    const result = await runPythonCommand("effects");
    return Array.isArray(result) ? result : [];
  } catch (error) {
    return [];
  }
}

/**
 * Trigger a vest effect
 */
async function triggerEffect(cell, speed) {
  try {
    await runPythonCommand("trigger", [`--cell=${cell}`, `--speed=${speed}`]);
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to trigger effect: ${error.message}`);
  }
}

/**
 * Stop all actuators
 */
async function stopAll() {
  try {
    await runPythonCommand("stop");
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to stop all: ${error.message}`);
  }
}

/**
 * Health check - verify Python CLI is reachable
 */
async function ping() {
  try {
    const result = await runPythonCommand("ping");
    return { success: true, message: result?.message ?? "ok" };
  } catch (error) {
    throw new Error(`Python bridge unreachable: ${error.message}`);
  }
}

module.exports = {
  getStatus,
  getEffects,
  triggerEffect,
  stopAll,
  ping,
};
