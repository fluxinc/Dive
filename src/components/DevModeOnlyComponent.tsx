import { useAtomValue } from "jotai"
import { devModeAtom } from "../atoms/devModeState"

export function DevModeOnlyComponent({component}: {component: React.ReactNode}) {
  const isDevMode = useAtomValue(devModeAtom)

  if (!isDevMode) return null

  return component
}