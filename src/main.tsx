import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "./styles/index.scss"
import App from "./App.tsx"
import "./i18n"
import platform from "./platform"

// Only needed in Electron environment
if (platform.isElectron) {
  const port = await new Promise<number>((resolve) => {
    window.ipcRenderer.onReceivePort((port: number) => {
      resolve(port)
    })

    const i = setInterval(() => {
      window.ipcRenderer.port().then((port: number) => {
        if (+port) {
          resolve(port)
          clearInterval(i)
        }
      })
    }, 1000)
  })

  console.log("host port", port)

  const originalFetch = window.fetch
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input !== "string" || (typeof input === "string" && !input.startsWith("/api")) && input !== "/model_verify") {
      return originalFetch(input, init)
    }

    return originalFetch(`http://localhost:${port}${input}`, {
      ...init,
      headers: {
        ...init?.headers,
        "X-Requested-With": "dive-desktop",
      },
    })
  }
}

// Get platform before rendering
const platformType = await platform.getPlatform()
window.PLATFORM = platformType as any

// wait for host to start
await new Promise(resolve => {
  const i = setInterval(() => {
    // Use /api/config/model instead of /api/ping since we verified it exists
    fetch("/api/config/model").then(() => {
      console.log("API server is ready")
      resolve(0)
      clearInterval(i)
    }).catch(err => {
      console.log("Waiting for API server...", err)
    })
  }, 1000)
})

// Set up context menu handling
window.addEventListener("contextmenu", (e) => {
  e.preventDefault()
  const selection = window.getSelection()?.toString()

  if (selection) {
    platform.showSelectionContextMenu()
  }
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
