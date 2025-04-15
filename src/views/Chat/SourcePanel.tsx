import React, { useMemo } from "react"
import { useTranslation } from 'react-i18next'
import { safeBase64Decode } from "../../util"

interface SourcePanelProps {
  content: string
}

interface SourceItem {
  url: string;
  filename?: string;
}

const SourcePanel: React.FC<SourcePanelProps> = ({ content }) => {
  const { t } = useTranslation()
  
  const sourceItems = useMemo(() => {
    try {
      return JSON.parse(safeBase64Decode(content))
    } catch (e) {
      console.error("Error parsing source items:", e)
      return []
    }
  }, [content])

  const sources = useMemo(() => {
    if (!sourceItems.length) return []
    
    return sourceItems.map((item: string | SourceItem) => {
      if (typeof item === 'string') {
        return {
          url: item,
          filename: '',
        }
      } else {
        return {
          url: item.url,
          filename: item.filename?.replace('.txt', '') || '',
        }
      }
    })
  }, [sourceItems])

  if (!content || sourceItems.length === 0) {
    return null
  }

  return (
    <details className="source-panel">
      <summary>
        {t("chat.sources", { count: sourceItems.length })}
      </summary>
      <div className="source-content">
        <ul className="source-list">
          {sources.map((source: SourceItem, index: number) => {
            return (
              <li key={index}>
                <a href={source.url} target="_blank" rel="noreferrer" title={source.url}>
                  {source.filename || source.url}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </details>
  )
}

export default React.memo(SourcePanel) 