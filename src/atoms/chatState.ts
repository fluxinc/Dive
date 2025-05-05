import { atom } from "jotai"

// Function to generate a random session ID
const generateSessionId = () => {
  // Use crypto.randomUUID if available, otherwise fallback to a simple random string
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Function to get or create a session ID
const getOrCreateSessionId = () => {
  // Check if we're in a browser environment
  if (typeof window !== "undefined" && window.localStorage) {
    // Try to get existing session ID from local storage
    const storedSessionId = localStorage.getItem("chat_session_id")
    
    if (storedSessionId) {
      return storedSessionId
    }
    
    // If no session ID exists, generate a new one and store it
    const newSessionId = generateSessionId()
    localStorage.setItem("chat_session_id", newSessionId)
    return newSessionId
  }
  
  // Fallback for non-browser environments
  return generateSessionId()
}

export const lastMessageAtom = atom<string>("")
export const currentChatIdAtom = atom<string>("")
export const isChatStreamingAtom = atom<boolean>(false)
export const sessionIdAtom = atom<string>(getOrCreateSessionId())