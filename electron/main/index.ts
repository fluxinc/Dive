import { app, BrowserWindow, shell, ipcMain, protocol, net } from "electron"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"
import os from "node:os"
import fse from "fs-extra"
import semver from "semver"
import AppState from "./state"
import { cleanup, initMCPClient } from "./service"
import { getLatestVersion, getNvmPath, modifyPath } from "./util"
import { binDirList, cacheDir, darwinPathList } from "./constant"
import { update } from "./update"
import { ipcHandler } from "./ipc"
import { initTray } from "./tray"

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-file",
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
    }
  }
])

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, "../..")

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1"))
  app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === "win32")
  app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, "../preload/index.mjs")
const indexHtml = path.join(RENDERER_DIST, "index.html")

async function onReady() {
  if (process.platform === "win32") {
    binDirList.forEach(modifyPath)
  } else if (process.platform === "darwin") {
    darwinPathList.forEach(modifyPath)

    const nvmPath = getNvmPath()
    if (nvmPath) {
      modifyPath(nvmPath)
    }
  }

  protocol.handle("local-file", (req) => {
    const url = req.url.replace("local-file:///", process.platform === "win32" ? "file:///" : "file://")
    return net.fetch(url)
  })

  initMCPClient()
  createWindow()
}

async function createWindow() {
  win = new BrowserWindow({
    title: "Dive AI",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  // resolve cors
  win.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      callback({ requestHeaders: { ...details.requestHeaders, Origin: '*' } });
    },
  );

  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Credentials': ['true'],
        'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'Access-Control-Allow-Headers': ['Content-Type', 'Authorization'],
      },
    });
  });

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.setMenu(null)
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:"))
      shell.openExternal(url)

    return { action: "deny" }
  })

  win.on("close", (event) => {
    if (!AppState.isQuitting) {
      event.preventDefault()
      win?.hide()
      return false
    }

    return true
  })

  // Auto update
  update(win)

  // Tray
  if (process.platform !== "darwin") {
    initTray(win)
  }

  // ipc handler
  ipcHandler(win)
}

app.whenReady().then(onReady)

app.on("window-all-closed", async () => {
  win = null
  if (process.platform !== "darwin") {
    await cleanup()
    app.quit()
  }
})

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized())
      win.restore()

    win.focus()
  }
})

app.on("before-quit", () => {
  AppState.setIsQuitting(true)
})

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    if (win) {
      win.show()
    } else {
      createWindow()
    }
  }
})

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

ipcMain.handle("api:checkNewVersion", async () => {
  try {
    fse.mkdirSync(cacheDir, { recursive: true })
    const pathToLastVersion = path.join(cacheDir, "lastVersion.json")
    let lastQueryTime = 0
    let lastVersion = ""

    if (fse.existsSync(pathToLastVersion)) {
      const body = await fse.readFile(pathToLastVersion, "utf-8")
      const data = JSON.parse(body)
      lastQueryTime = data.lastQueryTime
      lastVersion = data.lastVersion
    }

    const currentVersion = app.getVersion()
    if (lastQueryTime && +lastQueryTime > Date.now() + 1000 * 60 * 60) {
      return ""
    }

    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
      return lastVersion
    }

    const lastVersionOnGithub = await getLatestVersion()
    if (semver.gt(lastVersionOnGithub, currentVersion)) {
      await fse.writeFile(pathToLastVersion, JSON.stringify({
        lastQueryTime: Date.now(),
        lastVersion: lastVersionOnGithub,
      }))
      return lastVersionOnGithub
    }
  } catch (e) {
    console.error(e)
  }

  return ""
})