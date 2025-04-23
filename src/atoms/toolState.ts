import { atom } from "jotai"

export interface SubTool {
  name: string
  description?: string
  enabled: boolean
}

export interface Tool {
  name: string
  description?: string
  icon?: string
  tools?: SubTool[]
  enabled: boolean
  disabled: boolean
}

export const toolsAtom = atom<Tool[]>([])

export const enabledToolsAtom = atom<Tool[]>(
  (get) => {
    const tools = get(toolsAtom)
    return tools.filter((tool) => tool.enabled)
  }
)

export const loadToolsAtom = atom(
  null,
  async (get, set) => {
    try {
      const response = await fetch("/api/tools")
      const data = await response.json()
      if (data.success) {
        set(toolsAtom, data.tools)
      }
      return data
    } catch (error) {
      console.error("Error loading tools:", error)
      set(toolsAtom, [])
      return { success: false, message: error instanceof Error ? error.message : "Failed to load tools" }
    }
  }
)
