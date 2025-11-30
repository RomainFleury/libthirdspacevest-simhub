/**
 * Daemon Bridge - TCP client for communicating with the vest daemon.
 *
 * This module:
 * - Connects to the Python daemon via TCP
 * - Sends commands and receives responses
 * - Emits events received from the daemon
 *
 * Replaces the old pythonBridge.cjs which spawned CLI processes.
 */

const net = require("net");
const { EventEmitter } = require("events");
const { spawn } = require("child_process");
const path = require("path");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 5050;
const RECONNECT_DELAY_MS = 2000;
const CONNECT_TIMEOUT_MS = 5000;

// Path to the modern-third-space src directory
const PYTHON_SRC_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "modern-third-space",
  "src"
);

class DaemonBridge extends EventEmitter {
  constructor(host = DEFAULT_HOST, port = DEFAULT_PORT) {
    super();
    this.host = host;
    this.port = port;
    this.socket = null;
    this.buffer = "";
    this.connected = false;
    this.reconnecting = false;
    this.pendingRequests = new Map(); // req_id -> { resolve, reject, timeout }
    this.requestCounter = 0;
    this.daemonProcess = null;
  }

  /**
   * Connect to the daemon.
   * If daemon is not running, optionally start it.
   */
  async connect(autoStartDaemon = true) {
    if (this.connected) {
      return true;
    }

    try {
      await this._tryConnect();
      return true;
    } catch (error) {
      if (autoStartDaemon) {
        console.log("Daemon not running, attempting to start...");
        await this._startDaemon();
        // Wait a moment for daemon to start
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this._tryConnect();
        return true;
      }
      throw error;
    }
  }

  /**
   * Try to connect to the daemon.
   */
  _tryConnect() {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error("Connection timeout"));
      }, CONNECT_TIMEOUT_MS);

      socket.connect(this.port, this.host, () => {
        clearTimeout(timeout);
        this.socket = socket;
        this.connected = true;
        this.buffer = "";

        console.log(`✓ Connected to daemon at ${this.host}:${this.port}`);
        this.emit("daemon:connected");
        resolve();
      });

      socket.on("data", (data) => {
        this._handleData(data);
      });

      socket.on("close", () => {
        this.connected = false;
        this.socket = null;
        console.log("Disconnected from daemon");
        this.emit("daemon:disconnected");
        this._rejectAllPending("Connection closed");
      });

      socket.on("error", (err) => {
        clearTimeout(timeout);
        if (!this.connected) {
          reject(err);
        } else {
          console.error("Daemon connection error:", err.message);
          this.emit("daemon:error", err);
        }
      });
    });
  }

  /**
   * Start the daemon process.
   */
  _startDaemon() {
    return new Promise((resolve, reject) => {
      console.log("Starting daemon process...");

      const pythonArgs = [
        "-u",
        "-m",
        "modern_third_space.cli",
        "daemon",
        "--port",
        String(this.port),
      ];

      // Try to find Python executable (Windows uses 'python', Unix uses 'python3')
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      
      this.daemonProcess = spawn(pythonCmd, pythonArgs, {
        cwd: PYTHON_SRC_PATH,
        env: {
          ...process.env,
          PYTHONPATH: PYTHON_SRC_PATH,
        },
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      // Don't keep Electron alive just for the daemon
      this.daemonProcess.unref();

      let started = false;

      this.daemonProcess.stdout.on("data", (data) => {
        const output = data.toString();
        console.log("[daemon]", output.trim());
        if (output.includes("listening") && !started) {
          started = true;
          resolve();
        }
      });

      this.daemonProcess.stderr.on("data", (data) => {
        console.error("[daemon stderr]", data.toString().trim());
      });

      this.daemonProcess.on("error", (err) => {
        console.error("Failed to start daemon:", err.message);
        if (!started) {
          reject(err);
        }
      });

      // Timeout if daemon doesn't start
      setTimeout(() => {
        if (!started) {
          started = true;
          // Assume it started even without the log message
          resolve();
        }
      }, 3000);
    });
  }

  /**
   * Disconnect from the daemon.
   */
  disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this._rejectAllPending("Disconnected");
  }

  /**
   * Handle incoming data from the daemon.
   */
  _handleData(data) {
    this.buffer += data.toString();

    // Process complete lines
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);
        this._handleMessage(message);
      } catch (err) {
        console.error("Failed to parse daemon message:", line);
      }
    }
  }

  /**
   * Handle a parsed message from the daemon.
   */
  _handleMessage(message) {
    // Check if this is a response to a pending request
    if (message.response && message.req_id) {
      const pending = this.pendingRequests.get(message.req_id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.req_id);

        if (message.response === "error") {
          pending.reject(new Error(message.message || "Unknown error"));
        } else {
          pending.resolve(message);
        }
        return;
      }
    }

    // Check if this is a response without req_id
    if (message.response) {
      // Find oldest pending request that matches the response type
      // This is a fallback for responses without req_id
      for (const [reqId, pending] of this.pendingRequests.entries()) {
        if (pending.expectedResponse === message.response) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(reqId);

          if (message.response === "error") {
            pending.reject(new Error(message.message || "Unknown error"));
          } else {
            pending.resolve(message);
          }
          return;
        }
      }
    }

    // This is an event - emit it
    if (message.event) {
      this.emit("daemon:event", message);
      this.emit(`event:${message.event}`, message);
    }
  }

  /**
   * Send a command to the daemon and wait for response.
   */
  async sendCommand(cmd, params = {}, timeoutMs = 10000) {
    if (!this.connected) {
      throw new Error("Not connected to daemon");
    }

    const reqId = `req_${++this.requestCounter}_${Date.now()}`;
    const command = { cmd, req_id: reqId, ...params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        reject(new Error(`Command timeout: ${cmd}`));
      }, timeoutMs);

      this.pendingRequests.set(reqId, {
        resolve,
        reject,
        timeout,
        expectedResponse: cmd, // For matching responses without req_id
      });

      const data = JSON.stringify(command) + "\n";
      this.socket.write(data, (err) => {
        if (err) {
          clearTimeout(timeout);
          this.pendingRequests.delete(reqId);
          reject(err);
        }
      });
    });
  }

  /**
   * Reject all pending requests.
   */
  _rejectAllPending(reason) {
    for (const [reqId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  // -------------------------------------------------------------------------
  // High-level API (matches pythonBridge.cjs interface)
  // -------------------------------------------------------------------------

  /**
   * Ping the daemon (health check).
   */
  async ping() {
    try {
      const response = await this.sendCommand("ping");
      return {
        success: true,
        alive: response.alive,
        connected: response.connected,
        has_device_selected: response.has_device_selected,
        client_count: response.client_count,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get connection status.
   */
  async getStatus() {
    try {
      const response = await this.sendCommand("status");
      return {
        connected: response.connected ?? false,
        device_vendor_id: response.device?.vendor_id ?? null,
        device_product_id: response.device?.product_id ?? null,
        device_bus: response.device?.bus ?? null,
        device_address: response.device?.address ?? null,
        device_serial_number: response.device?.serial_number ?? null,
        last_error: null,
      };
    } catch (error) {
      return {
        connected: false,
        last_error: error.message,
      };
    }
  }

  /**
   * List available devices.
   */
  async listDevices() {
    try {
      const response = await this.sendCommand("list");
      return response.devices ?? [];
    } catch (error) {
      console.error("Failed to list devices:", error.message);
      return [];
    }
  }

  /**
   * Select a device.
   */
  async selectDevice(deviceInfo) {
    const params = {};
    if (deviceInfo?.bus !== undefined && deviceInfo?.address !== undefined) {
      params.bus = deviceInfo.bus;
      params.address = deviceInfo.address;
    } else if (deviceInfo?.serial_number) {
      params.serial = deviceInfo.serial_number;
    }

    await this.sendCommand("select_device", params);
    return { success: true };
  }

  /**
   * Get the currently selected device.
   */
  async getSelectedDevice() {
    try {
      const response = await this.sendCommand("get_selected_device");
      return response.device ?? null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Connect to the selected vest.
   */
  async connectToVest() {
    try {
      await this.sendCommand("connect");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect from the vest.
   */
  async disconnectFromVest() {
    try {
      await this.sendCommand("disconnect");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger an effect.
   * @param {Object} effect - Effect object with cell, speed, and optional device_id/player_id/game_id/player_num
   */
  async triggerEffect(effect) {
    try {
      const params = {
        cell: effect.cell,
        speed: effect.speed,
      };
      
      // Add optional multi-vest parameters
      if (effect.device_id) {
        params.device_id = effect.device_id;
      }
      if (effect.player_id) {
        params.player_id = effect.player_id;
      }
      if (effect.game_id) {
        params.game_id = effect.game_id;
      }
      if (effect.player_num !== undefined) {
        params.player_num = effect.player_num;
      }
      
      await this.sendCommand("trigger", params);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop all effects.
   */
  async stopAll() {
    try {
      await this.sendCommand("stop");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Legacy: Connect to a specific device (combines select + connect).
   * Kept for backwards compatibility with existing UI.
   */
  async connectToDevice(deviceInfo) {
    try {
      // First select the device
      await this.selectDevice(deviceInfo);
      // Then connect to it
      await this.connectToVest();
      // Get status to return full info
      return await this.getStatus();
    } catch (error) {
      return {
        connected: false,
        last_error: error.message,
      };
    }
  }

  /**
   * Get effects list - all 8 actuators + presets.
   * Note: This is static data, not from daemon.
   *
   * Vest layout:
   *     FRONT           BACK
   *   ┌───────┐      ┌───────┐
   *   │ 0   1 │      │ 4   5 │
   *   │ 2   3 │      │ 6   7 │
   *   └───────┘      └───────┘
   */
  async getEffects() {
    return [
      // All 8 actuators
      { label: "Front Upper Left", cell: 0, speed: 6 },
      { label: "Front Upper Right", cell: 1, speed: 6 },
      { label: "Front Lower Left", cell: 2, speed: 6 },
      { label: "Front Lower Right", cell: 3, speed: 6 },
      { label: "Back Upper Left", cell: 4, speed: 6 },
      { label: "Back Upper Right", cell: 5, speed: 6 },
      { label: "Back Lower Left", cell: 6, speed: 6 },
      { label: "Back Lower Right", cell: 7, speed: 6 },
      // Presets
      { label: "All Front", cell: -1, speed: 6, preset: "front" },
      { label: "All Back", cell: -2, speed: 6, preset: "back" },
      { label: "Full Blast", cell: -3, speed: 10, preset: "all" },
    ];
  }

  // -------------------------------------------------------------------------
  // CS2 GSI Integration API
  // -------------------------------------------------------------------------

  /**
   * Start CS2 GSI server.
   * @param {number} gsiPort - Port for the GSI HTTP server (default 3000)
   */
  async cs2Start(gsiPort = 3000) {
    try {
      const response = await this.sendCommand("cs2_start", { gsi_port: gsiPort });
      return {
        success: response.success ?? false,
        gsi_port: response.gsi_port,
        error: response.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Stop CS2 GSI server.
   */
  async cs2Stop() {
    try {
      const response = await this.sendCommand("cs2_stop");
      return {
        success: response.success ?? false,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get CS2 GSI status.
   */
  async cs2Status() {
    try {
      const response = await this.sendCommand("cs2_status");
      return {
        running: response.running ?? false,
        gsi_port: response.gsi_port ?? null,
        events_received: response.events_received ?? 0,
        last_event_ts: response.last_event_ts ?? null,
      };
    } catch (error) {
      return {
        running: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate CS2 GSI config file content.
   * @param {number} gsiPort - Port for the GSI HTTP server
   */
  async cs2GenerateConfig(gsiPort = 3000) {
    try {
      const response = await this.sendCommand("cs2_generate_config", {
        gsi_port: gsiPort,
      });
      return {
        success: true,
        config_content: response.config_content,
        filename: response.filename ?? "gamestate_integration_thirdspace.cfg",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Half-Life: Alyx Integration API
  // -------------------------------------------------------------------------

  /**
   * Start Alyx console log watcher.
   * @param {string} [logPath] - Optional path to console.log (auto-detect if not provided)
   */
  async alyxStart(logPath) {
    try {
      const params = logPath ? { log_path: logPath } : {};
      const response = await this.sendCommand("alyx_start", params);
      return {
        success: response.success ?? false,
        log_path: response.log_path,
        error: response.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Stop Alyx console log watcher.
   */
  async alyxStop() {
    try {
      const response = await this.sendCommand("alyx_stop");
      return {
        success: response.success ?? false,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get Alyx integration status.
   */
  async alyxStatus() {
    try {
      const response = await this.sendCommand("alyx_status");
      return {
        running: response.running ?? false,
        log_path: response.log_path ?? null,
        events_received: response.events_received ?? 0,
        last_event_ts: response.last_event_ts ?? null,
      };
    } catch (error) {
      return {
        running: false,
        error: error.message,
      };
    }
  }

  /**
   * Get Alyx mod info (download URLs, install instructions).
   */
  async alyxGetModInfo() {
    try {
      const response = await this.sendCommand("alyx_get_mod_info");
      return {
        success: true,
        mod_info: response.mod_info,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // -------------------------------------------------------------------------
  // SUPERHOT VR Integration API
  // -------------------------------------------------------------------------

  /**
   * Enable SUPERHOT VR integration.
   */
  async superhotStart() {
    try {
      await this.sendCommand("superhot_start");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable SUPERHOT VR integration.
   */
  async superhotStop() {
    try {
      await this.sendCommand("superhot_stop");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get SUPERHOT VR integration status.
   */
  async superhotStatus() {
    try {
      const response = await this.sendCommand("superhot_status");
      return {
        enabled: response.running ?? false,
        events_received: response.events_received ?? 0,
        last_event_ts: response.last_event_ts ?? null,
      };
    } catch (error) {
      return {
        enabled: false,
        error: error.message,
      };
    }
  }

  // Pistol Whip Integration API
  // -------------------------------------------------------------------------

  /**
   * Enable Pistol Whip integration.
   */
  async pistolwhipStart() {
    try {
      await this.sendCommand("pistolwhip_start");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable Pistol Whip integration.
   */
  async pistolwhipStop() {
    try {
      await this.sendCommand("pistolwhip_stop");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Pistol Whip integration status.
   */
  async pistolwhipStatus() {
    try {
      const response = await this.sendCommand("pistolwhip_status");
      return {
        enabled: response.running ?? false,
        events_received: response.events_received ?? 0,
        last_event_ts: response.last_event_ts ?? null,
        last_event_type: response.last_event_type ?? null,
      };
    } catch (error) {
      return {
        enabled: false,
        error: error.message,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Star Citizen Integration API
  // -------------------------------------------------------------------------

  /**
   * Start Star Citizen integration (watch Game.log).
   * @param {string} [logPath] - Optional path to Game.log (auto-detect if not provided)
   * @param {string} [playerName] - Optional player name to identify player events
   */
  async starcitizenStart(logPath, playerName) {
    try {
      const response = await this.sendCommand("starcitizen_start", {
        log_path: logPath,
        message: playerName, // Using message field for player name
      });
      return {
        success: response.success ?? true,
        log_path: response.log_path,
        error: response.message,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop Star Citizen integration.
   */
  async starcitizenStop() {
    try {
      await this.sendCommand("starcitizen_stop");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Star Citizen integration status.
   */
  async starcitizenStatus() {
    try {
      const response = await this.sendCommand("starcitizen_status");
      return {
        enabled: response.running ?? false,
        events_received: response.events_received ?? 0,
        last_event_ts: response.last_event_ts ?? null,
        last_event_type: response.last_event_type ?? null,
        log_path: response.log_path ?? null,
      };
    } catch (error) {
      return {
        enabled: false,
        error: error.message,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Left 4 Dead 2 Integration API
  // -------------------------------------------------------------------------

  /**
   * Start Left 4 Dead 2 console log watcher.
   * @param {string} [logPath] - Optional path to console.log (auto-detect if not provided)
   * @param {string} [playerName] - Optional player name to filter events
   */
  async l4d2Start(logPath, playerName) {
    try {
      const params = {};
      if (logPath) {
        params.log_path = logPath;
      }
      if (playerName) {
        params.message = playerName; // Using message field for player name
      }
      const response = await this.sendCommand("l4d2_start", params);
      return {
        success: response.success ?? true,
        log_path: response.log_path,
        error: response.message,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop Left 4 Dead 2 integration.
   */
  async l4d2Stop() {
    try {
      await this.sendCommand("l4d2_stop");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Left 4 Dead 2 integration status.
   */
  async l4d2Status() {
    try {
      const response = await this.sendCommand("l4d2_status");
      return {
        success: true,
        running: response.running ?? false,
        events_received: response.events_received ?? 0,
        last_event_ts: response.last_event_ts ?? null,
        last_event_type: response.last_event_type ?? null,
        log_path: response.log_path ?? null,
      };
    } catch (error) {
      return {
        success: false,
        running: false,
        error: error.message,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Predefined Effects Library API
  // -------------------------------------------------------------------------

  /**
   * Play a predefined effect by name.
   * @param {string} effectName - Name of the effect to play
   */
  async playEffect(effectName) {
    try {
      const response = await this.sendCommand("play_effect", {
        effect_name: effectName,
      });
      return {
        success: response.success ?? false,
        error: response.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List all available predefined effects.
   * Returns effects organized by category.
   */
  async listEffects() {
    try {
      const response = await this.sendCommand("list_effects");
      return {
        success: true,
        effects: response.effects ?? [],
        categories: response.categories ?? [],
      };
    } catch (error) {
      return {
        success: false,
        effects: [],
        categories: [],
        error: error.message,
      };
    }
  }

  /**
   * Stop any currently playing effect (emergency stop).
   */
  async stopEffect() {
    try {
      await this.sendCommand("stop_effect");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
let instance = null;

function getDaemonBridge() {
  if (!instance) {
    instance = new DaemonBridge();
  }
  return instance;
}

module.exports = {
  DaemonBridge,
  getDaemonBridge,
};

