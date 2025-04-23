/**
 * Platform compatibility layer
 * 
 * This file provides a unified interface to platform-specific APIs,
 * allowing the app to run in both Electron and browser environments.
 */

// Default hotkey map structure that matches what the app expects
const defaultHotkeyMap = {
  "chat-input:submit": "<c-s-m>",
  "chat-input:upload-file": "<c-p>",
  "chat-input:focus": "<c-l>",
  "chat-input:paste-last-message": "<c-y>",
  "chat-message:copy-last": "<c-c>",
  "chat:delete": "<c-d>",
  "global:new-chat": "<c-n>",
  "global:toggle-sidebar": "<c-b>",
  "global:close-layer": "Escape",
  "global:toggle-keymap-modal": "<c-/>"
}

// Browser storage keys
const STORAGE_KEYS = {
  MODEL_LIST_OPENAI: "dive_model_list_openai",
  MODEL_LIST_ANTHROPIC: "dive_model_list_anthropic",
  MODEL_LIST_OLLAMA: "dive_model_list_ollama",
  MODEL_LIST_MISTRAL: "dive_model_list_mistral",
  MODEL_LIST_GOOGLE: "dive_model_list_google",
  MODEL_LIST_OPENAI_COMPATIBLE: "dive_model_list_openai_compatible",
  MODEL_LIST_BEDROCK: "dive_model_list_bedrock",
  HOTKEY_MAP: "dive_hotkey_map",
  AUTO_LAUNCH: "dive_auto_launch",
  MINIMAL_TO_TRAY: "dive_minimal_to_tray",
  CONFIGS: "dive_configs"
}

// Helper functions for localStorage
const getStorageItem = (key: string, defaultValue: any) => {
  try {
    const storedValue = localStorage.getItem(key)
    if (storedValue) {
      return JSON.parse(storedValue)
    }
    return defaultValue
  } catch (error) {
    console.error(`Error getting storage item ${key}:`, error)
    return defaultValue
  }
}

const setStorageItem = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Error setting storage item ${key}:`, error)
    return false
  }
}

// Detect environment
const isElectron = typeof window.ipcRenderer !== "undefined"

// Platform API
export const platform = {
  isElectron,
  
  // Model APIs
  openaiModelList: async (apiKey: string) => {
    if (isElectron) {
      return await window.ipcRenderer.openaiModelList(apiKey)
    } else {
      console.log("Mock openaiModelList called")
      // Check if we have a cached model list for this API key
      const storageKey = `${STORAGE_KEYS.MODEL_LIST_OPENAI}_${apiKey.substring(0, 8)}`
      const cachedList = getStorageItem(storageKey, null)
      if (cachedList) {
        return cachedList
      }
      const result = { results: ["gpt-3.5-turbo", "gpt-4"], error: null }
      setStorageItem(storageKey, result)
      return result
    }
  },
  
  anthropicModelList: async (apiKey: string, baseURL?: string) => {
    if (isElectron) {
      return await window.ipcRenderer.anthropicModelList(apiKey, baseURL || "")
    } else {
      const storageKey = `${STORAGE_KEYS.MODEL_LIST_ANTHROPIC}_${apiKey.substring(0, 8)}_${baseURL || "default"}`
      const cachedList = getStorageItem(storageKey, null)
      if (cachedList) {
        return cachedList
      }
      const result = { results: ["claude-3-opus", "claude-3-sonnet"], error: null }
      setStorageItem(storageKey, result)
      return result
    }
  },
  
  ollamaModelList: async (baseURL?: string) => {
    if (isElectron) {
      return await window.ipcRenderer.ollamaModelList(baseURL || "")
    } else {
      const storageKey = `${STORAGE_KEYS.MODEL_LIST_OLLAMA}_${baseURL || "default"}`
      const cachedList = getStorageItem(storageKey, null)
      if (cachedList) {
        return cachedList
      }
      const result = { results: ["llama2", "mistral"], error: null }
      setStorageItem(storageKey, result)
      return result
    }
  },
  
  mistralaiModelList: async (apiKey: string) => {
    if (isElectron) {
      return await window.ipcRenderer.mistralaiModelList(apiKey)
    } else {
      const storageKey = `${STORAGE_KEYS.MODEL_LIST_MISTRAL}_${apiKey.substring(0, 8)}`
      const cachedList = getStorageItem(storageKey, null)
      if (cachedList) {
        return cachedList
      }
      const result = { results: ["mistral-medium", "mistral-small"], error: null }
      setStorageItem(storageKey, result)
      return result
    }
  },
  
  googleGenaiModelList: async (apiKey: string) => {
    if (isElectron) {
      return await window.ipcRenderer.googleGenaiModelList(apiKey)
    } else {
      const storageKey = `${STORAGE_KEYS.MODEL_LIST_GOOGLE}_${apiKey.substring(0, 8)}`
      const cachedList = getStorageItem(storageKey, null)
      if (cachedList) {
        return cachedList
      }
      const result = { results: ["gemini-pro", "gemini-1.5-pro"], error: null }
      setStorageItem(storageKey, result)
      return result
    }
  },
  
  openaiCompatibleModelList: async (apiKey: string, baseURL?: string) => {
    if (isElectron) {
      return await window.ipcRenderer.openaiCompatibleModelList(apiKey, baseURL || "")
    } else {
      const storageKey = `${STORAGE_KEYS.MODEL_LIST_OPENAI_COMPATIBLE}_${apiKey.substring(0, 8)}_${baseURL || "default"}`
      const cachedList = getStorageItem(storageKey, null)
      
      if (cachedList) {
        return cachedList
      }
      
      try {
        // Fetch models from the compatible API
        const url = `${baseURL || "https://api.openai.com"}/v1/models`
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.statusText}`)
        }
        
        const data = await response.json()
        const modelNames = data.data.map((model: any) => model.id)
        
        // Only include chat models (typically what we want)
        const chatModels = modelNames.filter((name: string) => 
          name.includes("gpt") || name.includes("chat") || name.includes("instruct")
        )
        
        const result = { results: chatModels, error: null }
        setStorageItem(storageKey, result)
        return result
      } catch (error) {
        console.error("Error fetching OpenAI compatible models:", error)
        // Fallback to default models
        const result = { results: ["gpt-3.5-turbo", "gpt-4"], error: String(error) }
        return result
      }
    }
  },
  
  bedrockModelList: async (accessKeyId: string, secretAccessKey: string, sessionToken: string, region: string) => {
    if (isElectron) {
      return await window.ipcRenderer.bedrockModelList(accessKeyId, secretAccessKey, sessionToken, region)
    } else {
      const storageKey = `${STORAGE_KEYS.MODEL_LIST_BEDROCK}_${accessKeyId.substring(0, 8)}_${region}`
      const cachedList = getStorageItem(storageKey, null)
      if (cachedList) {
        return cachedList
      }
      const result = { results: ["anthropic.claude-v2", "amazon.titan-text"], error: null }
      setStorageItem(storageKey, result)
      return result
    }
  },
  
  // Hotkey mapping
  getHotkeyMap: async () => {
    if (isElectron) {
      return await window.ipcRenderer.getHotkeyMap()
    } else {
      console.log("Mock getHotkeyMap called")
      // Get custom hotkeys from localStorage or use default
      return getStorageItem(STORAGE_KEYS.HOTKEY_MAP, defaultHotkeyMap)
    }
  },
  
  // UI interactions
  showSelectionContextMenu: async () => {
    if (isElectron) {
      return await window.ipcRenderer.showSelectionContextMenu()
    } else {
      console.log("Context menu not available in browser mode")
      // Could implement a DOM-based context menu for browser
      return
    }
  },
  
  showInputContextMenu: async () => {
    if (isElectron) {
      return await window.ipcRenderer.showInputContextMenu()
    } else {
      console.log("Input context menu not available in browser mode")
      // Could implement a DOM-based context menu for browser
      return
    }
  },
  
  // System information
  getPlatform: async () => {
    if (isElectron) {
      return await window.ipcRenderer.getPlatform()
    } else {
      return navigator.platform.toLowerCase().includes("win") ? "win32" : 
             navigator.platform.toLowerCase().includes("mac") ? "darwin" : "linux"
    }
  },
  
  // Settings
  getAutoLaunch: async () => {
    if (isElectron) {
      return await window.ipcRenderer.getAutoLaunch()
    } else {
      return getStorageItem(STORAGE_KEYS.AUTO_LAUNCH, false)
    }
  },
  
  setAutoLaunch: async (enable: boolean) => {
    if (isElectron) {
      return await window.ipcRenderer.setAutoLaunch(enable)
    } else {
      return setStorageItem(STORAGE_KEYS.AUTO_LAUNCH, enable)
    }
  },
  
  getMinimalToTray: async () => {
    if (isElectron) {
      return await window.ipcRenderer.getMinimalToTray()
    } else {
      return getStorageItem(STORAGE_KEYS.MINIMAL_TO_TRAY, false)
    }
  },
  
  setMinimalToTray: async (enable: boolean) => {
    if (isElectron) {
      return await window.ipcRenderer.setMinimalToTray(enable)
    } else {
      return setStorageItem(STORAGE_KEYS.MINIMAL_TO_TRAY, enable)
    }
  },
  
  // Resource loading
  getResourcesPath: async (p: string) => {
    if (isElectron) {
      return await window.ipcRenderer.getResourcesPath(p)
    } else {
      return `/${p}`
    }
  },
  
  // Configuration path handling
  fillPathToConfig: async (path: string) => {
    if (isElectron) {
      return await window.ipcRenderer.fillPathToConfig(path)
    } else {
      try {
        // Parse the config JSON
        const configObj = JSON.parse(path)
        
        // Check if config exists in localStorage
        const storedConfigs = getStorageItem(STORAGE_KEYS.CONFIGS, {})
        
        // If we have a stored version of this config, use it for reference
        if (configObj.mcpServers) {
          const { mcpServers: servers } = configObj
          
          // Process each server in mcpServers
          const mcpServers = Object.keys(servers).reduce((acc, server) => {
            const serverConfig = servers[server]
            
            // Check if we have a stored config for this server
            const storedServerConfig = storedConfigs[server]
            
            // If no args, just use the existing config
            if (!serverConfig.args) {
              return acc
            }
            
            // In browser mode, we can't check file existence, but we'll modify paths
            // to use relative paths that would typically be found in the scripts directory
            const pathToScript = serverConfig.args.find((arg: any) => 
              typeof arg === "string" && (arg.endsWith(".js") || arg.endsWith(".ts"))
            )
            
            if (pathToScript) {
              // Find the index of the script path in the args array
              const argsIndex = serverConfig.args.findIndex((arg: any) => arg === pathToScript)
              
              if (argsIndex !== -1) {
                // Create a copy of the args array
                const newArgs = [...serverConfig.args]
                
                // Get just the filename from the path
                const filename = pathToScript.split("/").pop()?.split("\\").pop()
                
                // In browser, use a path like '/scripts/filename.js'
                if (filename) {
                  newArgs[argsIndex] = `/scripts/${filename}`
                  
                  // Store the mapping in localStorage for future reference
                  if (storedServerConfig) {
                    storedConfigs[server] = {
                      ...storedServerConfig,
                      scriptPath: `/scripts/${filename}`
                    }
                  } else {
                    storedConfigs[server] = {
                      scriptPath: `/scripts/${filename}`
                    }
                  }
                }
                
                // Update the server config with new args
                acc[server] = {
                  ...serverConfig,
                  args: newArgs
                }
                
                return acc
              }
            }
            
            // If we have a stored config but not in the current config, use it
            if (storedServerConfig && storedServerConfig.scriptPath) {
              const newArgs = [...serverConfig.args]
              const argsIndex = serverConfig.args.findIndex((arg: any) => 
                typeof arg === "string" && (arg.endsWith(".js") || arg.endsWith(".ts"))
              )
              
              if (argsIndex !== -1) {
                newArgs[argsIndex] = storedServerConfig.scriptPath
                
                acc[server] = {
                  ...serverConfig,
                  args: newArgs
                }
                
                return acc
              }
            }
            
            // If we didn't find a script path or couldn't process it, use original config
            return acc
          }, servers)
          
          // Save updated configs to localStorage
          setStorageItem(STORAGE_KEYS.CONFIGS, storedConfigs)
          
          // Return the updated config
          return JSON.stringify({ ...configObj, mcpServers })
        }
        
        // If no mcpServers in config, return original
        return path
      } catch (error) {
        console.error("Error in browser fillPathToConfig:", error)
        // If parsing fails, return the original config
        return path
      }
    }
  }
}

export default platform 