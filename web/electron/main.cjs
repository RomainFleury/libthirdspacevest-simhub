const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const pythonBridge = require("./pythonBridge.cjs");

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

function getIconPath() {
  return isDev
    ? path.join(__dirname, "..", "src", "assets", "vest-logo-color.png")
    : path.join(process.cwd(), "dist", "vest-logo-color.png");
}

async function createWindow() {
  const window = new BrowserWindow({
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
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
    window.webContents.openDevTools();
  } else {
    await window.loadFile(path.join(process.cwd(), "dist", "index.html"));
  }

  // Set up IPC handlers
  setupIpcHandlers();

  // Verify Python bridge is reachable on startup
  pythonBridge
    .ping()
    .then(() => {
      console.log("✓ Python bridge is reachable");
    })
    .catch((err) => {
      console.error("✗ Python bridge unreachable:", err.message);
    });
}

function setupIpcHandlers() {
  // Ping (health check)
  ipcMain.handle("vest:ping", async () => {
    return await pythonBridge.ping();
  });

  // Status
  ipcMain.handle("vest:status", async () => {
    return await pythonBridge.getStatus();
  });

  // Effects
  ipcMain.handle("vest:effects", async () => {
    return await pythonBridge.getEffects();
  });

  // Trigger effect
  ipcMain.handle("vest:trigger", async (_, effect) => {
    return await pythonBridge.triggerEffect(effect.cell, effect.speed);
  });

  // Stop all
  ipcMain.handle("vest:stop", async () => {
    return await pythonBridge.stopAll();
  });
}

app.on("ready", () => {
  // Set dock icon on macOS
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(getIconPath());
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
