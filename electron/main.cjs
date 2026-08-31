const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

let server;
const DESKTOP_PORT = 47831;

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#f4fbf7",
    title: "TaskFlow",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://127.0.0.1:${DESKTOP_PORT}`)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
  window.loadURL(`http://127.0.0.1:${DESKTOP_PORT}`);
}

app.whenReady().then(() => {
  process.env.TASKFLOW_DATA_DIR = app.getPath("userData");
  process.env.JWT_SECRET = "taskflow-desktop-local-session";
  process.env.NODE_ENV = "production";
  const { startServer } = require("../backend/server.js");
  server = startServer(DESKTOP_PORT);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (server) server.close();
});
