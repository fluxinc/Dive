import React, { useState, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Toast from "./Toast"

export interface ChatHistory {
  id: string
  title: string
  createdAt: string
}

interface Props {
  onNewChat?: () => void
}

const HistorySidebar = ({ onNewChat }: Props) => {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)
  const [histories, setHistories] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadChatHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/list")
      const data = await response.json()

      if (data.success) {
        setHistories(data.data)
      }
    } catch (error) {
      console.warn("Failed to load chat history:", error)
    }
  }, [])

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation() // 防止觸發 loadChat
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        setToast({
          message: '對話已刪除',
          type: 'success'
        })
        // 如果刪除的是當前對話，導航到首頁
        if (chatId === currentChatId) {
          navigate('/')
        }
        // 重新載入歷史記錄
        loadChatHistory()
      } else {
        setToast({
          message: '刪除失敗',
          type: 'error'
        })
      }
    } catch (error) {
      setToast({
        message: '刪除失敗',
        type: 'error'
      })
    }
  }

  const loadChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId)
    setIsVisible(false)
    navigate(`/chat/${chatId}`)
  }, [navigate])

  const handleNewChat = () => {
    setCurrentChatId(null)
    if (onNewChat) {
      onNewChat()
    } else {
      navigate('/')
    }
  }

  const showHistory = () => {
    setIsVisible(true)
  }

  const hideHistory = () => {
    setIsVisible(false)
  }

  useEffect(() => {
    if (isVisible) {
      loadChatHistory()
    }
  }, [isVisible, loadChatHistory])

  return (
    <>
      <div 
        className="history-trigger"
        onMouseEnter={showHistory}
      />
      <div 
        className={`history-sidebar ${isVisible ? "visible" : ""}`}
        onMouseLeave={hideHistory}
      >
        <div className="history-header">
          <button onClick={handleNewChat} className="new-chat-btn">
            + New Chat
          </button>
        </div>
        {histories.map(chat => (
          <div 
            key={chat.id}
            className={`history-item ${chat.id === currentChatId ? "active" : ""}`}
            onClick={() => loadChat(chat.id)}
          >
            <div className="history-content">
              <div className="history-title">{chat.title || "未命名對話"}</div>
              <div className="history-date">
                {new Date(chat.createdAt).toLocaleString()}
              </div>
            </div>
            <button 
              className="delete-btn"
              onClick={(e) => deleteChat(e, chat.id)}
              title="刪除對話"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}

export default React.memo(HistorySidebar) 