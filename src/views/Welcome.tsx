import React, { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useSetAtom, useAtomValue } from "jotai"
import { codeStreamingAtom } from "../atoms/codeStreaming"
import { useTranslation } from "react-i18next"
import { sessionHistoriesAtom, loadSessionHistoriesAtom } from "../atoms/historyState"
import { activeConfigAtom, currentModelSupportToolsAtom, isConfigActiveAtom, isConfigNotInitializedAtom } from "../atoms/configState"
import Setup from "./Setup"
import { openOverlayAtom } from "../atoms/layerState"
import useHotkeyEvent from "../hooks/useHotkeyEvent"
import Textarea from "../components/WrappedTextarea"
import Tooltip from "../components/Tooltip"
import { enabledToolsAtom, loadToolsAtom } from "../atoms/toolState"
import { DevModeOnlyComponent } from "../components/DevModeOnlyComponent"
import { windowTitleAtom } from "../atoms/windowState"
import ChatInput from "../components/ChatInput"

const formatFileSize = (bytes: number) => {
  if (bytes === 0)
    return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const Welcome = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const updateStreamingCode = useSetAtom(codeStreamingAtom)
  const sessionHistories = useAtomValue(sessionHistoriesAtom)
  const loadSessionHistories = useSetAtom(loadSessionHistoriesAtom)
  const isConfigNotInitialized = useAtomValue(isConfigNotInitializedAtom)

  useEffect(() => {
    document.title = t("header.title")
  }, [])

  useEffect(() => {
    updateStreamingCode(null)
  }, [updateStreamingCode])

  useEffect(() => {
    loadSessionHistories()
  }, [loadSessionHistories])

  if (isConfigNotInitialized) {
    return <Setup />
  }

  return (
    <div className="main-container">
      <div className="welcome-content">
        <h1 className="welcome-title"><span className="beta-overlay"> [BETA]</span></h1>
        <p className="welcome-subtitle"></p>

        <ChatInput
          page="welcome"
          onSendMessage={() => {}}
          disabled={false}
          onAbort={() => {}}
        />

        <div className="suggestions">
          {sessionHistories.length > 0 && (
            <>
              {sessionHistories.slice(0, 3).map(history => (
                <div
                  key={history.id}
                  className="suggestion-item"
                  onClick={() => navigate(`/chat/${history.id}`)}
                >
                  <div className="content-wrapper">
                    <strong>{history.title || t("chat.untitledChat")}</strong>
                  </div>
                  <div className="bottom-row">
                    <p>{new Date(history.createdAt).toLocaleString()}</p>
                    <span className="arrow">→</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default React.memo(Welcome)
