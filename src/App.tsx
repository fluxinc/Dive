import { RouterProvider } from "react-router-dom"
import { router } from "./router"
import { useSetAtom, useAtomValue } from "jotai"
import { loadConfigAtom, modelVerifyListAtom } from "./atoms/configState"
import { useEffect, useState } from "react"
import { handleGlobalHotkey, loadHotkeyMapAtom } from "./atoms/hotkeyState"
import { handleWindowResizeAtom } from "./atoms/sidebarState"
import { systemThemeAtom, themeAtom } from "./atoms/themeState"
import { NewVerifyStatus, OldVerifyStatus } from "./atoms/configState"
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
  const setAllVerifiedList = useSetAtom(modelVerifyListAtom)

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


  // convert old model verify status to new model verify status
  //TODO: remove this after all verified list is converted in future version
  useEffect(() => {
    const result: Record<string, Record<string, NewVerifyStatus | string>> = {}
    const allVerifiedListString = localStorage.getItem("modelVerify")
    const allVerifiedList = JSON.parse(allVerifiedListString || "{}") as Record<string, Record<string, NewVerifyStatus | string>>
    for (const [apiKey, models] of Object.entries({ ...allVerifiedList })) {
      result[apiKey] = {} as Record<string, NewVerifyStatus | string>

      for (const [modelName, status] of Object.entries(models)) {
        if (status === "ignore") {
          result[apiKey][modelName] = "ignore"
          continue
        }

        if ((status as NewVerifyStatus).connecting?.final_state || (status as NewVerifyStatus).supportTools?.final_state) {
          result[apiKey][modelName] = status as NewVerifyStatus
          continue
        }

        const oldStatus = status as unknown as OldVerifyStatus
        result[apiKey][modelName] = {
          success: oldStatus.success,
          connecting: {
            success: oldStatus.connectingSuccess,
            final_state: oldStatus.connectingSuccess ? "CONNECTED" : "ERROR",
            error_msg: oldStatus.connectingSuccess ? null : (oldStatus.connectingResult ?? "Connection failed")
          },
          supportTools: {
            success: oldStatus.supportTools,
            final_state: oldStatus.supportTools ? "TOOL_RESPONDED" : "ERROR",
            error_msg: oldStatus.supportTools ? null : (oldStatus.supportToolsResult ?? "Tool verification failed")
          }
        }
      }
    }
    setAllVerifiedList(result)
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
