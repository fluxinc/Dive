import React, { useMemo } from "react"
import { useTranslation } from 'react-i18next'
import { safeBase64Decode } from "../../util"

interface SourcePanelProps {
  content: string
}

const SourcePanel: React.FC<SourcePanelProps> = ({ content }) => {
  const { t } = useTranslation()
  const sourceUrls = useMemo(() => {
    try {
      return JSON.parse(safeBase64Decode(content))
    } catch (e) {
      console.error("Error parsing source URLs:", e)
      return []
    }
  }, [content])

  if (!content || sourceUrls.length === 0) {
    return null
  }

  return (
    <details className="source-panel">
      <summary>
        {t("chat.sources", { count: sourceUrls.length })}
      </summary>
      <div className="source-content">
        <ul className="source-list">
          {sourceUrls.map((url: string, index: number) => (
            <li key={index}>
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}

export default React.memo(SourcePanel) 