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
      return { results: ["gpt-3.5-turbo", "gpt-4"], error: null }
    }
  },
  
  anthropicModelList: async (apiKey: string, baseURL?: string) => {
    if (isElectron) {
      return await window.ipcRenderer.anthropicModelList(apiKey, baseURL || "")
    } else {
      return { results: ["claude-3-opus", "claude-3-sonnet"], error: null }
    }
  },
  
  ollamaModelList: async (baseURL?: string) => {
    if (isElectron) {
      return await window.ipcRenderer.ollamaModelList(baseURL || "")
    } else {
      return { results: ["llama2", "mistral"], error: null }
    }
  },
  
  mistralaiModelList: async (apiKey: string) => {
    if (isElectron) {
      return await window.ipcRenderer.mistralaiModelList(apiKey)
    } else {
      return { results: ["mistral-medium", "mistral-small"], error: null }
    }
  },
  
  googleGenaiModelList: async (apiKey: string) => {
    if (isElectron) {
      return await window.ipcRenderer.googleGenaiModelList(apiKey)
    } else {
      return { results: ["gemini-pro", "gemini-1.5-pro"], error: null }
    }
  },
  
  openaiCompatibleModelList: async (apiKey: string, baseURL?: string) => {
    if (isElectron) {
      return await window.ipcRenderer.openaiCompatibleModelList(apiKey, baseURL || "")
    } else {
      return { results: ["gpt-3.5-turbo", "gpt-4"], error: null }
    }
  },
  
  bedrockModelList: async (accessKeyId: string, secretAccessKey: string, sessionToken: string, region: string) => {
    if (isElectron) {
      return await window.ipcRenderer.bedrockModelList(accessKeyId, secretAccessKey, sessionToken, region)
    } else {
      return { results: ["anthropic.claude-v2", "amazon.titan-text"], error: null }
    }
  },
  
  // Hotkey mapping
  getHotkeyMap: async () => {
    if (isElectron) {
      return await window.ipcRenderer.getHotkeyMap()
    } else {
      console.log("Mock getHotkeyMap called")
      return defaultHotkeyMap
    }
  },
  
  // UI interactions
  showSelectionContextMenu: async () => {
    if (isElectron) {
      return await window.ipcRenderer.showSelectionContextMenu()
    } else {
      console.log("Context menu not available in browser mode")
      return
    }
  },
  
  showInputContextMenu: async () => {
    if (isElectron) {
      return await window.ipcRenderer.showInputContextMenu()
    } else {
      console.log("Input context menu not available in browser mode")
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
      return false
    }
  },
  
  setAutoLaunch: async (enable: boolean) => {
    if (isElectron) {
      return await window.ipcRenderer.setAutoLaunch(enable)
    }
  },
  
  getMinimalToTray: async () => {
    if (isElectron) {
      return await window.ipcRenderer.getMinimalToTray()
    } else {
      return false
    }
  },
  
  setMinimalToTray: async (enable: boolean) => {
    if (isElectron) {
      return await window.ipcRenderer.setMinimalToTray(enable)
    }
  },
  
  // Resource loading
  getResourcesPath: async (p: string) => {
    if (isElectron) {
      return await window.ipcRenderer.getResourcesPath(p)
    } else {
      return `/${p}`
    }
  }
}

export default platform 