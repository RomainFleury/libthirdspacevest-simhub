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
    try {
      return await pythonBridge.ping();
    } catch (error) {
      console.error("Error in vest:ping:", error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  });

  // Status
  ipcMain.handle("vest:status", async () => {
    try {
      return await pythonBridge.getStatus();
    } catch (error) {
      console.error("Error in vest:status:", error);
      return {
        connected: false,
        last_error: error.message || "Failed to get status",
      };
    }
  });

  // Effects
  ipcMain.handle("vest:effects", async () => {
    try {
      return await pythonBridge.getEffects();
    } catch (error) {
      console.error("Error in vest:effects:", error);
      return [];
    }
  });

  // Trigger effect
  ipcMain.handle("vest:trigger", async (_, effect) => {
    try {
      return await pythonBridge.triggerEffect(effect.cell, effect.speed);
    } catch (error) {
      console.error("Error in vest:trigger:", error);
      return {
        success: false,
        error: error.message || "Failed to trigger effect",
      };
    }
  });

  // Stop all
  ipcMain.handle("vest:stop", async () => {
    try {
      return await pythonBridge.stopAll();
    } catch (error) {
      console.error("Error in vest:stop:", error);
      return {
        success: false,
        error: error.message || "Failed to stop all",
      };
    }
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
