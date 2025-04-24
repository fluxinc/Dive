import { RouterProvider } from "react-router-dom"
import { router } from "./router"
import { useSetAtom } from "jotai"
import { loadConfigAtom } from "./atoms/configState"
import { useEffect, useState } from "react"
import { handleGlobalHotkey, loadHotkeyMapAtom } from "./atoms/hotkeyState"
import { handleWindowResizeAtom } from "./atoms/sidebarState"
import { systemThemeAtom } from "./atoms/themeState"
import Updater from "./updater"
import WindowTitle from "./components/WindowTitle"

// Check if we're running in Electron
const isElectron = typeof window !== "undefined" && typeof window.ipcRenderer !== "undefined"

// Beta overlay component
const BetaOverlay = () => {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      color: 'rgba(255, 255, 255, 0.5)',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '28px',
      fontWeight: 'bold',
      pointerEvents: 'none',
      zIndex: 9999,
      transform: 'translateZ(0)',
      userSelect: 'none',
      isolation: 'isolate',
    }}>
      BETA
    </div>
  )
}

function App() {
  const [loading, setLoading] = useState(true)
  const loadConfig = useSetAtom(loadConfigAtom)
  const loadHotkeyMap = useSetAtom(loadHotkeyMapAtom)
  const setSystemTheme = useSetAtom(systemThemeAtom)
  const handleWindowResize = useSetAtom(handleWindowResizeAtom)
  // init app
  useEffect(() => {
    loadHotkeyMap()
    loadConfig().finally(() => {
      setLoading(false)
      window.postMessage({ payload: "removeLoading" }, "*")
    })

    window.addEventListener("resize", handleWindowResize)
    window.addEventListener("keydown", handleGlobalHotkey)
    return () => {
      window.removeEventListener("resize", handleWindowResize)
      window.removeEventListener("keydown", handleGlobalHotkey)
    }
  }, [])

  // set system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [])

  if (loading) {
    return <></>
  }

  return (
    <>
      <WindowTitle />
      <RouterProvider router={router} />
      {isElectron && <Updater />}
      <BetaOverlay />
    </>
  )
}

export default App
