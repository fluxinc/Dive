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
      const decoded = safeBase64Decode(content)
      
      // Try to parse as JSON first {filename: string, url: string}[]
      try {
        const jsonData = JSON.parse(decoded)
        return jsonData
      } catch {
        // If JSON parsing fails, try string format with <FILENAME> tags
        const sources: SourceItem[] = []
        
        const lines = decoded.split('\n')
        
        for (const line of lines) {
          if (!line.trim()) continue
          
          if (line.includes("</FILENAME>")) {
            const splitSource = line.split("</FILENAME>")
            const filename = splitSource[0].slice(line.indexOf("<FILENAME>") + "<FILENAME>".length)
            const url = splitSource[1]
            sources.push({ 
              filename: filename.replace('.txt', ''), 
              url 
            })
          } else {
            // Just a URL without filename
            sources.push({ url: line })
          }
        }
        
        return sources
      }
    } catch (e) {
      console.error("Error parsing source items:", e)
      return []
    }
  }, [content])
  
  const sources = useMemo(() => {
    if (!sourceItems || !sourceItems.length) return []
    
    const _sources = sourceItems.map((item: string | SourceItem) => {
      if (typeof item === 'string') {
        return {
          url: item,
          filename: '',
        }
      } else {
        return {
          url: item.url,
          filename: transformFilename(item.filename || ''),
        }
      }
    })

    // Filter out duplicate urls and filenames
    const uniqueSources: SourceItem[] = _sources.filter((source: SourceItem, index: number, self: SourceItem[]) =>
      index === self.findIndex((t: SourceItem) => t.url === source.url || t.filename === source.filename)
    );

    return uniqueSources;
  }, [sourceItems])

  function transformFilename(filename: string) {
    return filename.replaceAll('.txt', '').replaceAll('.pdf', '').replaceAll('-', ' ').replaceAll('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  if (!content || !sources || sources.length === 0) {
    return null
  }

  return (
    <details className="source-panel">
      <summary>
        {t("chat.sources", { count: sources.length })}
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