/**
 * Electron Main Process
 *
 * Initializes the application window, connects to the vest daemon,
 * and registers IPC handlers for communication with the renderer process.
 */

const { app, BrowserWindow } = require("electron");
const path = require("path");
const { getDaemonBridge } = require("./daemonBridge.cjs");
const { registerAllHandlers } = require("./ipc/index.cjs");

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

let mainWindow = null;
let daemonBridge = null;

// -------------------------------------------------------------------------
// Getter functions for IPC handlers
// -------------------------------------------------------------------------

function getMainWindow() {
  return mainWindow;
}

function getDaemonBridgeInstance() {
  return daemonBridge;
}

// -------------------------------------------------------------------------
// Window Management
// -------------------------------------------------------------------------

function getIconPath() {
  return isDev
    ? path.join(__dirname, "..", "src", "assets", "round-icon-small.png")
    : path.join(process.cwd(), "dist", "round-icon-small.png");
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#020617",
    icon: getIconPath(),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(process.cwd(), "dist", "index.html"));
  }

  // Set up IPC handlers (using modular structure)
  registerAllHandlers(getDaemonBridgeInstance, getMainWindow, connectToDaemon);

  // Connect to daemon
  await connectToDaemon();
}

// -------------------------------------------------------------------------
// Daemon Connection
// -------------------------------------------------------------------------

/**
 * Connect to the vest daemon and set up event forwarding.
 */
async function connectToDaemon() {
  daemonBridge = getDaemonBridge();

  // Forward daemon events to renderer
  daemonBridge.on("daemon:event", (event) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vest:event", event);
    }
  });

  daemonBridge.on("daemon:connected", () => {
    console.log("✓ Connected to vest daemon");
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vest:daemon-status", { connected: true });
    }
  });

  daemonBridge.on("daemon:disconnected", () => {
    console.log("✗ Disconnected from vest daemon");
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("vest:daemon-status", { connected: false });
    }
  });

  try {
    // Connect to daemon (will auto-start if not running)
    await daemonBridge.connect(true);
    console.log("✓ Daemon bridge initialized");
  } catch (err) {
    console.error("✗ Failed to connect to daemon:", err.message);
  }
}

// -------------------------------------------------------------------------
// App Lifecycle
// -------------------------------------------------------------------------

app.on("ready", () => {
  // Set dock icon on macOS
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(getIconPath());
  }
  createWindow();
});

app.on("window-all-closed", () => {
  // Disconnect from daemon
  if (daemonBridge) {
    daemonBridge.disconnect();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
