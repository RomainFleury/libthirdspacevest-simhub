const { spawn } = require("child_process");
const path = require("path");

// Path to the modern-third-space src directory (for PYTHONPATH)
const PYTHON_SRC_PATH = path.resolve(
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
          const errorMsg =
            stderr || stdout || `Process exited with code ${code}`;
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
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });
    } catch (setupError) {
      reject(
        new Error(`Failed to setup Python command: ${setupError.message}`)
      );
    }
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
      device_bus: result?.device_bus ?? null,
      device_address: result?.device_address ?? null,
      device_serial_number: result?.device_serial_number ?? null,
      last_error: result?.last_error ?? null,
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

/**
 * List all available USB vest devices
 */
async function listDevices() {
  try {
    const result = await runPythonCommand("list");
    return Array.isArray(result) ? result : [];
  } catch (error) {
    return [];
  }
}

/**
 * Connect to a specific device
 * @param {Object} deviceInfo - Device information (bus, address, serial_number, or index)
 */
async function connectToDevice(deviceInfo) {
  try {
    const args = [];

    if (deviceInfo?.bus !== undefined && deviceInfo?.address !== undefined) {
      args.push(`--bus=${deviceInfo.bus}`, `--address=${deviceInfo.address}`);
    } else if (deviceInfo?.serial_number) {
      args.push(`--serial=${deviceInfo.serial_number}`);
    } else if (deviceInfo?.index !== undefined) {
      args.push(`--index=${deviceInfo.index}`);
    }
    // If no deviceInfo provided, connects to first device

    const result = await runPythonCommand("connect", args);
    return {
      connected: result?.connected ?? false,
      device_vendor_id: result?.device_vendor_id ?? null,
      device_product_id: result?.device_product_id ?? null,
      device_bus: result?.device_bus ?? null,
      device_address: result?.device_address ?? null,
      device_serial_number: result?.device_serial_number ?? null,
      last_error: result?.last_error ?? null,
    };
  } catch (error) {
    return {
      connected: false,
      last_error: error.message,
    };
  }
}

module.exports = {
  getStatus,
  getEffects,
  triggerEffect,
  stopAll,
  ping,
  listDevices,
  connectToDevice,
};
