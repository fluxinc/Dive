import { RouterProvider } from "react-router-dom"
import { router } from "./router"
import { useSetAtom, useAtomValue } from "jotai"
import { loadConfigAtom } from "./atoms/configState"
import { useEffect, useState } from "react"
import { handleGlobalHotkey, loadHotkeyMapAtom } from "./atoms/hotkeyState"
import { handleWindowResizeAtom } from "./atoms/sidebarState"
import { systemThemeAtom, themeAtom } from "./atoms/themeState"
import Updater from "./updater"
import WindowTitle from "./components/WindowTitle"

// Check if we're running in Electron
const isElectron = typeof window !== "undefined" && typeof window.ipcRenderer !== "undefined"

// Corner logo component
const CornerLogo = () => {
  const currentTheme = useAtomValue(themeAtom)
  const systemTheme = useAtomValue(systemThemeAtom)
  
  // Determine if we're in light mode (and thus need inversion)
  const isLightMode = currentTheme === "light" || (currentTheme === "system" && systemTheme === "light")
  
  return (
    <div
      className="corner-logo"
    >
      <a href="https://sh.fluxinc.co/about-sbi" target="_blank" rel="noopener noreferrer">
        <img 
          src="./flux-logo-white.png" 
          alt="Fluxinc logo" 
          width="120" 
          height="40" 
          style={{ filter: isLightMode ? 'invert(1)' : 'none' }}
        />
      </a>
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
      <CornerLogo />
    </>
  )
}

export default App
