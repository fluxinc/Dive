import { useEffect } from "react"
import { useAtomValue } from "jotai"
import { windowTitleAtom } from "../atoms/windowState"

const WindowTitle = () => {
  const title = useAtomValue(windowTitleAtom)

  useEffect(() => {
    document.title = title
  }, [title])

  return null
}

export default WindowTitle 