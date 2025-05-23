import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useTranslation } from "react-i18next"
import Select from "../../components/Select"
import { closeOverlayAtom } from "../../atoms/layerState"
import React, { useState, useEffect } from "react"
import {DevModeOnlyComponent} from "../../components/DevModeOnlyComponent"
import ThemeSwitch from "../../components/ThemeSwitch"
import Switch from "../../components/Switch"
import { getAutoDownload, setAutoDownload as _setAutoDownload } from "../../updater"
import PopupConfirm from "../../components/PopupConfirm"
import { showToastAtom } from "../../atoms/toastState"
import { historiesAtom, loadHistoriesAtom } from "../../atoms/historyState"
import { useNavigate } from "react-router-dom"
import { currentChatIdAtom } from "../../atoms/chatState"
import { disableDiveSystemPromptAtom, updateDisableDiveSystemPromptAtom } from "../../atoms/configState"

const System = () => {
  const { t, i18n } = useTranslation()
  const [, closeOverlay] = useAtom(closeOverlayAtom)
  const [language, setLanguage] = useState(i18n.language)
  const [autoDownload, setAutoDownload] = useState(false)
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [minimalToTray, setMinimalToTray] = useState(false)
  const [showClearAllChatsConfirm, setShowClearAllChatsConfirm] = useState(false)
  const [isElectron, setIsElectron] = useState(false)
  const showToast = useSetAtom(showToastAtom)
  const histories = useAtomValue(historiesAtom)
  const loadHistories = useSetAtom(loadHistoriesAtom)
  const navigate = useNavigate()
  const setCurrentChatId = useSetAtom(currentChatIdAtom)
  const disableDiveSystemPrompt = useAtomValue(disableDiveSystemPromptAtom)
  const [, updateDisableDiveSystemPrompt] = useAtom(updateDisableDiveSystemPromptAtom)

  useEffect(() => {
    import("../../platform").then(({ platform }) => {
      setIsElectron(platform.isElectron)
      platform.getAutoLaunch().then(setAutoLaunch)
      platform.getMinimalToTray().then(setMinimalToTray)
    })
  }, [])

  const handleAutoLaunchChange = (value: boolean) => {
    setAutoLaunch(value)
    import("../../platform").then(({ platform }) => {
      platform.setAutoLaunch(value)
    })
  }

  const languageOptions = [
    { label: t("system.languageDefault"), value: "default" },
    { label: "繁體中文", value: "zh-TW" },
    { label: "简体中文", value: "zh-CN" },
    { label: "English", value: "en" },
    { label: "Español", value: "es" },
    { label: "日本語", value: "ja" },
  ]

  useEffect(() => {
    setAutoDownload(getAutoDownload())
  }, [])

  const onClose = () => {
    closeOverlay("System")
  }

  const handleLanguageChange = async (value: string) => {
    setLanguage(value)
    await i18n.changeLanguage(value === "default" ? navigator.language : value)

    if (value !== "default") {
      setDefaultInstructions()
    }
  }

  const setDefaultInstructions = async () => {
    try {
      const response = await fetch("/api/config/customrules")
      const data = await response.json()
      if (data.success && data.rules === "") {
        await fetch("/api/config/customrules", {
          method: "POST",
          body: t("system.defaultInstructions")
        })
      }
    } catch (error) {
      console.error("Failed to fetch custom rules:", error)
    }
  }

  const handleMinimalToTrayChange = (value: boolean) => {
    setMinimalToTray(value)
    import("../../platform").then(({ platform }) => {
      platform.setMinimalToTray(value)
    })
  }

  const handleOpenClearAllChatsConfirm = () => {
    // Check if there are no chats to delete
    if (histories.length === 0) {
      showToast({
        message: t("system.noChatHistoryToDelete"),
        type: "info"
      })
      return
    }
    setShowClearAllChatsConfirm(true)
  }

  const handleClearAllChats = async () => {
    try {
      let successCount = 0
      let failCount = 0

      // Delete each chat one by one
      for (const chat of histories) {
        try {
          // Delete from the database
          const response = await fetch(`/api/chat/${chat.id}`, {
            method: "DELETE"
          })
          const data = await response.json()
          
          if (data.success) {
            // Also clear MCP server data for this chat
            try {
              await fetch(`/api/mcp/clear/${chat.id}`, {
                method: "POST"
              })
            } catch (_) {
              // Continue even if MCP clear fails, as the main DB deletion was successful
            }
            successCount++
          } else {
            failCount++
          }
        } catch (_error) {
          failCount++
        }
      }

      // Navigate to home if currently in a chat
      navigate("/")
      setCurrentChatId("")
      
      // Refresh the chat history list
      loadHistories()
      
      // Show success/failure message
      if (failCount === 0) {
        showToast({
          message: t("system.clearAllChatsSuccess"),
          type: "success"
        })
      } else if (successCount > 0) {
        showToast({
          message: t("system.clearAllChatsPartial", { success: successCount, fail: failCount }),
          type: "warning"
        })
      } else {
        showToast({
          message: t("system.clearAllChatsFailed"),
          type: "error"
        })
      }
    } catch (_error) {
      showToast({
        message: t("system.clearAllChatsFailed"),
        type: "error"
      })
    } finally {
      setShowClearAllChatsConfirm(false)
    }
  }

  const handleDefaultSystemPromptChange = async (value: boolean) => {
    await updateDisableDiveSystemPrompt({ value })
  }

  return (
    <div className="system-page overlay-page">
      <button
        className="close-btn"
        onClick={onClose}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div className="system-container">
        <div className="system-header">
          <div>
            <h1>{t("system.title")}</h1>
          </div>
        </div>
        <div className="system-content">

          {/* theme */}
          <div className="system-list-section">
            <div className="system-list-content">
              <span className="system-list-name">{t("system.theme")}:</span>
            </div>
            <div className="system-list-switch-container">
              <ThemeSwitch />
            </div>
          </div>

          {/* auto download */}
          {isElectron && (
            <div className="system-list-section">
              <div className="system-list-content">
                <span className="system-list-name">{t("system.autoDownload")}:</span>
              </div>
            <div className="system-list-switch-container">
              <Switch
                checked={autoDownload}
                onChange={(e) => {
                  setAutoDownload(e.target.checked)
                  _setAutoDownload(e.target.checked)
                }}
              />
              </div>
            </div>
          )}

          {/* auto launch - only show in Electron mode */}
          {isElectron && (
            <div className="system-list-section">
              <div className="system-list-content">
                <span className="system-list-name">{t("system.autoLaunch")}:</span>
              </div>
              <div className="system-list-switch-container">
                <Switch
                  checked={autoLaunch}
                  onChange={e => handleAutoLaunchChange(e.target.checked)}
                />
              </div>
            </div>
          )}

          {/* minimal to tray - only show in Electron mode */}
          {isElectron && (
            <div className="system-list-section">
              <div className="system-list-content">
                <span className="system-list-name">{t("system.minimalToTray")}:</span>
              </div>
              <div className="system-list-switch-container">
                <Switch
                  checked={minimalToTray}
                  onChange={e => handleMinimalToTrayChange(e.target.checked)}
                />
              </div>
              <span className="system-list-description">{t("system.minimalToTrayDescription")}</span>
            </div>
          )}

          {/* clear all chats */}
          <DevModeOnlyComponent component={
            <div className="system-list-section">
              <div className="system-list-content">
                <span className="system-list-name">{t("system.clearAllChats")}:</span>
              </div>
            <div className="system-list-switch-container">
              <button 
                className="clear-all-chats-btn"
                onClick={handleOpenClearAllChatsConfirm}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                </svg>
                {t("system.clearAllChatsButton")}
              </button>
            </div>
            </div>
          } />
          {/* auto launch */}
          {isElectron && (
            <div className="system-list-section">
              <div className="system-list-content">
                <span className="system-list-name">{t("system.autoLaunch")}</span>
                <div className="system-list-switch-container">
                <Switch
                  checked={autoLaunch}
                  onChange={e => handleAutoLaunchChange(e.target.checked)}
                />
              </div>
            </div>
            <span className="system-list-description">{t("system.autoLaunchDescription")}</span>
          </div>
          )}

          {/* auto download */}
          {isElectron && (
            <div className="system-list-section">
              <div className="system-list-content">
                <span className="system-list-name">{t("system.autoDownload")}</span>
              <div className="system-list-switch-container">
                <Switch
                  checked={autoDownload}
                  onChange={(e) => {
                    setAutoDownload(e.target.checked)
                    _setAutoDownload(e.target.checked)
                  }}
                />
              </div>
            </div>
            <span className="system-list-description">{t("system.autoDownloadDescription")}</span>
          </div>
          )}

          {/* language */}
          <div className="system-list-section">
            <div className="system-list-content">
              <span className="system-list-name">{t("system.language")}</span>
              <div className="system-list-switch-container">
                <Select
                  options={languageOptions}
                  value={language}
                  onSelect={(value) => handleLanguageChange(value)}
                  align="end"
                />
              </div>
            </div>
            <span className="system-list-description">{t("system.languageDescription")}</span>
          </div>

          {/* default System Prompt */}
          <DevModeOnlyComponent component={
            <div className="system-list-section">
              <div className="system-list-content">
                <span className="system-list-name">{t("system.defaultSystemPrompt")}</span>
                <div className="system-list-switch-container">
                <Switch
                  checked={!disableDiveSystemPrompt}
                  onChange={e => handleDefaultSystemPromptChange(!e.target.checked)}
                />
              </div>
            </div>
            <span className="system-list-description">{t("system.defaultSystemPromptDescription")}</span>
          </div>
          } />
        </div>
      </div>

      {/* Confirmation dialog for clearing all chats */}
      {showClearAllChatsConfirm && (
        <PopupConfirm
          title={t("system.clearAllChatsConfirmTitle")}
          confirmText={t("common.confirm")}
          cancelText={t("common.cancel")}
          onConfirm={handleClearAllChats}
          onCancel={() => setShowClearAllChatsConfirm(false)}
          onClickOutside={() => setShowClearAllChatsConfirm(false)}
          noBorder
          footerType="center"
          zIndex={1000}
        >
          <div className="clear-all-chats-confirm-content">
            <p>{t("system.clearAllChatsConfirmDescription")}</p>
          </div>
        </PopupConfirm>
      )}
    </div>
  )
}

export default React.memo(System)
