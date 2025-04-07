import { atom } from 'jotai'

// Check if we're in development mode using Vite's environment variable
const isDevMode = import.meta.env.DEV

export const devModeAtom = atom<boolean>(isDevMode) 