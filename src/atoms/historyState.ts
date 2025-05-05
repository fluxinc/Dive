import { atom } from "jotai"
import { sessionIdAtom } from "./chatState"

export interface ChatHistory {
  id: string
  title: string
  createdAt: string
  session_id?: string
}

export const historiesAtom = atom<ChatHistory[]>([])
export const sessionHistoriesAtom = atom<ChatHistory[]>([])

export const loadHistoriesAtom = atom(
  null,
  async (get, set) => {
    try {
      const response = await fetch("/api/chat/list?sort_by=msg")
      const data = await response.json()

      if (data.success) {
        set(historiesAtom, data.data)
      }
    } catch (error) {
      console.warn("Failed to load chat history:", error)
    }
  }
)

export const loadSessionHistoriesAtom = atom(
  null,
  async (get, set) => {
    try {
      const sessionId = get(sessionIdAtom)
      const response = await fetch(`/api/chat/list?sort_by=msg&sessionId=${encodeURIComponent(sessionId)}`)
      const data = await response.json()

      if (data.success) {
        set(sessionHistoriesAtom, data.data)
      }
    } catch (error) {
      console.warn("Failed to load session chat history:", error)
    }
  }
)