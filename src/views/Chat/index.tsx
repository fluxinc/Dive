import React, { useRef, useState, useCallback, useEffect } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import ChatMessages, { Message, Source } from "./ChatMessages"
import ChatInput from "./ChatInput"
import { useAtom, useSetAtom } from 'jotai'
import { codeStreamingAtom } from '../../atoms/codeStreaming'
import useHotkeyEvent from "../../hooks/useHotkeyEvent"
import { showToastAtom } from "../../atoms/toastState"
import { useTranslation } from "react-i18next"
import { currentChatIdAtom, isChatStreamingAtom, lastMessageAtom } from "../../atoms/chatState"
import { safeBase64Encode } from "../../util"
import { windowTitleAtom } from "../../atoms/windowState"

interface ToolCall {
  name: string
  arguments: any
}

interface ToolResult {
  name: string
  result: any
}

interface RawMessage {
  id: string
  createdAt: string
  content: string
  role: "user" | "assistant" | "tool_call" | "tool_result"
  chatId: string
  messageId: string
  toolCalls?: ToolCall[] | Record<string, ToolCall[]>
  resource_usage: {
    model: string
    total_input_tokens: number
    total_output_tokens: number
    total_run_time: number
  }
  files: File[]
}

const ChatWindow = () => {
  const { chatId } = useParams()
  const location = useLocation()
  const [messages, setMessages] = useState<Message[]>([])
  const currentId = useRef(0)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const currentChatId = useRef<string | null>(null)
  const navigate = useNavigate()
  const isInitialMessageHandled = useRef(false)
  const showToast = useSetAtom(showToastAtom)
  const { t } = useTranslation()
  const updateStreamingCode = useSetAtom(codeStreamingAtom)
  const setLastMessage = useSetAtom(lastMessageAtom)
  const setCurrentChatId = useSetAtom(currentChatIdAtom)
  const [isChatStreaming, setIsChatStreaming] = useAtom(isChatStreamingAtom)
  const toolCallResults = useRef<string>("")
  const toolResultCount = useRef(0)
  const toolResultTotal = useRef(0)
  const setWindowTitle = useSetAtom(windowTitleAtom)

  const loadChat = useCallback(async (id: string) => {
    try {
      setIsChatStreaming(true)
      const response = await fetch(`/api/chat/${id}`)
      const data = await response.json()

      if (data.success) {
        currentChatId.current = id
        setWindowTitle(`${data.data.chat.title} - AI Assistant`)

        const rawToMessage = (msg: RawMessage): Message => ({
          id: msg.messageId || msg.id || String(currentId.current++),
          text: msg.content,
          isSent: msg.role === "user",
          timestamp: new Date(msg.createdAt).getTime(),
          files: msg.files
        })

        let toolCallBuf: any[] = []
        let toolResultBuf: string[] = []

        const messages = data.data.messages
        const convertedMessages = messages
          .reduce((acc: Message[], msg: RawMessage, index: number) => {
            // push user message and first assistant message
            if (msg.role === "user") {
              acc.push(rawToMessage(msg))
              return acc
            }

            const isLastSent = acc[acc.length - 1].isSent

            // merge files from user message and assistant message
            if (!isLastSent) {
              acc[acc.length - 1].files = [
                ...(acc[acc.length - 1].files || []),
                ...(msg.files || [])
              ]
            }

            switch (msg.role) {
              case "tool_call":
                toolCallBuf.push(JSON.parse(msg.content))
                if (isLastSent) {
                  acc.push(rawToMessage({ ...msg, content: "" }))
                }
                break
              case "tool_result":
                toolResultBuf.push(msg.content)
                if (messages[index + 1]?.role === "tool_result") {
                  break
                }

                const [callContent, toolsName] = toolCallBuf.reduce((_acc, call) => {
                  _acc[0] += `##Tool Calls:${safeBase64Encode(JSON.stringify(call))}`

                  const toolName = Array.isArray(call) ? call[0]?.name : call.name || ""
                  toolName && _acc[1].add(toolName)
                  return _acc
                }, ["", new Set()])

                const resultContent = toolResultBuf.reduce((_acc, result) =>
                  _acc + `##Tool Result:${safeBase64Encode(result)}`
                , "")

                const content = `${callContent}${resultContent}`
                const toolName = toolsName.size > 0 ? JSON.stringify(Array.from(toolsName).join(", ")) : ""
                acc[acc.length - 1].text += `\n<tool-call name=${toolName || '""'}>${content}</tool-call>\n\n`

                toolCallBuf = []
                toolResultBuf = []
                break
              case "assistant":
                const isToolCall = (Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0) || (typeof msg.toolCalls === "object" && Object.keys(msg.toolCalls).length > 0)
                if (isToolCall) {
                  if (isLastSent) {
                    acc.push(rawToMessage({ ...msg, content: msg.content }))
                  } else if(msg.content && toolCallBuf.length === 0) {
                    acc[acc.length - 1].text += msg.content
                  }

                  toolCallBuf.push(msg.toolCalls)
                  break
                }

                if (isLastSent) {
                  acc.push(rawToMessage(msg))
                } else {
                  acc[acc.length - 1].text += msg.content
                }
                break
            }

            return acc
          }, [])

        setMessages(convertedMessages)
        fetchSources(id)
      }
    } catch (error) {
      console.warn("Failed to load chat:", error)
    } finally {
      setIsChatStreaming(false)
    }
  }, [])

  useHotkeyEvent("chat-message:copy-last", async () => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage) {
      await navigator.clipboard.writeText(lastMessage.text)
      showToast({
        message: t("toast.copiedToClipboard"),
        type: "success"
      })
    }
  })

  useEffect(() => {
    if (messages.length > 0 && !isChatStreaming) {
      setLastMessage(messages[messages.length - 1].text);
    }
  }, [messages, setLastMessage, isChatStreaming]);

  useEffect(() => {
    if (chatId && chatId !== currentChatId.current) {
      loadChat(chatId)
      setCurrentChatId(chatId)
    }
  }, [chatId, loadChat, setCurrentChatId])

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [])

  const onSendMsg = useCallback(async (msg: string, files?: FileList) => {
    if (isChatStreaming) return

    const formData = new FormData()
    if (msg)
      formData.append("message", msg)

    if (currentChatId.current)
      formData.append("chatId", currentChatId.current)

    if (files) {
      Array.from(files).forEach(file => {
        formData.append("files", file)
      })
    }

    const userMessage: Message = {
      id: `${currentId.current++}`,
      text: msg,
      isSent: true,
      timestamp: Date.now(),
      files: files ? Array.from(files) : undefined
    }

    const aiMessage: Message = {
      id: `${currentId.current++}`,
      text: "",
      isSent: false,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage, aiMessage])
    setIsChatStreaming(true)
    scrollToBottom()

    handlePost(formData, "formData", "/api/chat")
  }, [isChatStreaming, scrollToBottom])

  const onAbort = useCallback(async () => {
    if (!isChatStreaming || !currentChatId.current)
      return

    try {
      await fetch(`/api/chat/${currentChatId.current}/abort`, {
        method: "POST",
      })
    } catch (error) {
      console.error("Failed abort:", error)
    }
  }, [isChatStreaming, currentChatId.current, scrollToBottom])

  const onRetry = useCallback(async (messageId: string) => {
    if (isChatStreaming || !currentChatId.current)
      return

    let prevMessages = {} as Message
    setMessages(prev => {
      let newMessages = [...prev]
      const messageIndex = newMessages.findIndex(msg => msg.id === messageId)
      if (messageIndex !== -1) {
        prevMessages = {...newMessages[messageIndex]}
        prevMessages.text = ""
        prevMessages.isError = false
        // Keep the sources from the original message
        newMessages = newMessages.slice(0, messageIndex)
      }
      return newMessages
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    setMessages(prev => {
      const newMessages = [...prev]
      newMessages.push(prevMessages)
      return newMessages
    })
    setIsChatStreaming(true)
    scrollToBottom()

    const body = JSON.stringify({
      chatId: currentChatId.current,
      messageId: prevMessages.isSent ? prevMessages.id : messageId,
    })

    handlePost(body, "json", "/api/chat/retry")
  }, [isChatStreaming, currentChatId.current])

  const onEdit = useCallback(async (messageId: string, newText: string) => {
    if (isChatStreaming || !currentChatId.current)
      return

    let prevMessages = {} as Message
    setMessages(prev => {
      let newMessages = [...prev]
      const messageIndex = newMessages.findIndex(msg => msg.id === messageId)
      if (messageIndex !== -1) {
        prevMessages = {...newMessages[messageIndex + 1]}
        prevMessages.text = ""
        prevMessages.isError = false
        // Keep the sources from the original message
        newMessages = newMessages.slice(0, messageIndex+1)
      }
      return newMessages
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    setMessages(prev => {
      const newMessages = [...prev]
      newMessages.push(prevMessages)
      return newMessages
    })
    setIsChatStreaming(true)
    scrollToBottom()

    const body = new FormData()
    body.append("chatId", currentChatId.current)
    body.append("messageId", prevMessages.isSent ? prevMessages.id : messageId)
    body.append("content", newText)

    handlePost(body, "formData", "/api/chat/edit")
  }, [isChatStreaming, currentChatId.current])

  const handlePost = useCallback(async (body: any, type: "json" | "formData", url: string) => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: type === "json" ? {
          "Content-Type": "application/json",
        } : {},
        body: body
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let currentText = ""
      let chunkBuf = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }

        const chunk = decoder.decode(value)
        const lines = (chunkBuf + chunk).split("\n")
        chunkBuf = lines.pop() || ""

        for (const line of lines) {
          if (line.trim() === "" || !line.startsWith("data: "))
            continue

          const dataStr = line.slice(5)
          if (dataStr.trim() === "[DONE]")
            break

          try {
            const dataObj = JSON.parse(dataStr)
            if (dataObj.error) {
              setMessages(prev => {
                const newMessages = [...prev]
                newMessages[newMessages.length - 1] = {
                  id: `${currentId.current++}`,
                  text: `Error: ${dataObj.error}`,
                  isSent: false,
                  timestamp: Date.now(),
                  isError: true
                }
                return newMessages
              })
              break
            }

            const data = JSON.parse(dataObj.message)
            switch (data.type) {
              case "text":
                currentText += data.content
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1].text = currentText
                  return newMessages
                })
                scrollToBottom()
                break

              case "tool_calls":
                const toolCalls = data.content as ToolCall[]
                if (data.content?.every((call: {name: string}) => !call.name)) {
                  continue
                }

                const tools = data.content
                  ?.filter((call: {name: string}) => call.name !== "")
                  ?.map((call: {name: string}) => call.name) || []
                toolResultTotal.current = tools.length

                const uniqTools = new Set(tools)
                const toolName = uniqTools.size === 0 ? "%name%" : Array.from(uniqTools).join(", ")

                toolCallResults.current += `\n<tool-call name="${toolName}">##Tool Calls:${safeBase64Encode(JSON.stringify(toolCalls))}`
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1].text = currentText + toolCallResults.current + "</tool-call>"
                  return newMessages
                })
                break

              case "tool_result":
                const result = data.content as ToolResult

                toolCallResults.current = toolCallResults.current.replace(`</tool-call>\n`, "")
                toolCallResults.current += `##Tool Result:${safeBase64Encode(JSON.stringify(result.result))}</tool-call>\n`

                setMessages(prev => {
                  const newMessages = [...prev]
                  // Add the current message text along with tool results
                  newMessages[newMessages.length - 1].text = currentText + toolCallResults.current.replace("%name%", result.name)
                  return newMessages
                })

                toolResultCount.current++
                if (toolResultTotal.current === toolResultCount.current) {
                  currentText += toolCallResults.current.replace("%name%", result.name)
                  toolCallResults.current = ""
                  toolResultTotal.current = 0
                  toolResultCount.current = 0
                }

                break

              case "chat_info":
                document.title = `${data.content.title} - AI Assistant`
                currentChatId.current = data.content.id
                navigate(`/chat/${data.content.id}`, { replace: true })
                break

              case "message_info":
                setMessages(prev => {
                  const newMessages = [...prev]
                  if(data.content.userMessageId) {
                    newMessages[newMessages.length - 2].id = data.content.userMessageId
                  }
                  if(data.content.assistantMessageId) {
                    newMessages[newMessages.length - 1].id = data.content.assistantMessageId
                  }
                  return newMessages
                })
                break

              case "error":
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = {
                    id: `${currentId.current++}`,
                    text: `Error: ${data.content}`,
                    isSent: false,
                    timestamp: Date.now(),
                    isError: true
                  }
                  return newMessages
                })
                break
            }
          } catch (error) {
            console.warn(error)
          }
        }
      }
      // After each post request, update sources
      try {
        await fetchSources(currentChatId.current);
      } catch (error) {
        console.warn("Error fetching sources:", error)
      }
    } catch (error: any) {
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = {
          id: `${currentId.current++}`,
          text: `Error: ${error.message}`,
          isSent: false,
          timestamp: Date.now(),
          isError: true
        }
        return newMessages
      })
    } finally {
      setIsChatStreaming(false)
      scrollToBottom()
    }
  }, [])

  // Extract source fetching to a separate function
  const fetchSources = useCallback(async (chatId: string | null) => {
    if (!chatId) return;
    
    const sourceResponse = await fetch(`/api/chat/${chatId}/sources`, {
      method: "GET",
    });
    const sourceData = await sourceResponse.json();

    if (sourceData.success && sourceData.sources) {
      const sourcesList: Source[] = sourceData.sources.map((source: { filename: string, url: string }) => ({
        filename: source.filename,
        url: source.url
      }));
      
      // Create a completely new messages array to ensure React detects the change
      setMessages(prev => {
        // Create new message objects without sources
        const newMessages: Message[] = prev.map(msg => {
          return {
            id: msg.id,
            text: msg.text,
            isSent: msg.isSent,
            timestamp: msg.timestamp,
            files: msg.files,
            isError: msg.isError
          };
        });
        
        if (newMessages.length > 0) {
          // Add sources only to the last message
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            sources: sourcesList
          };
        }
        return newMessages;
      });
    }
  }, []);

  const handleInitialMessage = useCallback(async (message: string, files?: File[]) => {
    if (files && files.length > 0) {
      const fileList = new DataTransfer()
      files.forEach(file => fileList.items.add(file))
      await onSendMsg(message, fileList.files)
    } else {
      await onSendMsg(message)
    }
    navigate(location.pathname, { replace: true, state: {} })
  }, [onSendMsg, navigate, location.pathname])

  useEffect(() => {
    const state = location.state as { initialMessage?: string, files?: File[] } | null

    if ((state?.initialMessage || state?.files) && !isInitialMessageHandled.current) {
      isInitialMessageHandled.current = true
      handleInitialMessage(state?.initialMessage || '', state?.files)
    }
  }, [handleInitialMessage])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const lastChatId = useRef(chatId)
  useEffect(() => {
    if (lastChatId.current && lastChatId.current !== chatId) {
      updateStreamingCode(null)
    }

    lastChatId.current = chatId
  }, [updateStreamingCode, chatId])

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-window">
          <ChatMessages
            messages={messages}
            isLoading={isChatStreaming}
            onRetry={onRetry}
            onEdit={onEdit}
          />
          <ChatInput
            onSendMessage={onSendMsg}
            disabled={isChatStreaming}
            onAbort={onAbort}
          />
        </div>
      </div>
    </div>
  )
}

export default React.memo(ChatWindow)
