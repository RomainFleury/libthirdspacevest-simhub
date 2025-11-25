const { app, BrowserWindow } = require("electron");
const path = require("path");

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
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
    window.webContents.openDevTools();
  } else {
    await window.loadFile(path.join(process.cwd(), "dist", "index.html"));
  }
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
