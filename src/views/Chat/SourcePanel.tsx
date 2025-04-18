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
        
        return sources.sort((a : SourceItem, b : SourceItem) => {
          const aName = a.filename || a.url
          const bName = b.filename || b.url
          if (!aName && !bName) return 0;
          if (!aName) return 1;
          if (!bName) return -1;
          return aName.localeCompare(bName);
        })
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

    // Filter out duplicate urls only
    const uniqueSources: SourceItem[] = _sources.filter((source: SourceItem, index: number, self: SourceItem[]) =>
      index === self.findIndex((t: SourceItem) => t.url === source.url)
    );

    // Sort sources by filename
    uniqueSources.sort((a: SourceItem, b: SourceItem) => {
      const aName = a.filename || a.url;
      const bName = b.filename || b.url;
      if (!aName && !bName) return 0;
      if (!aName) return 1;
      if (!bName) return -1;
      return aName.localeCompare(bName);
    });
    
    // For debugging - log the sources order
    console.log("Sources after sorting:", uniqueSources.map(s => s.filename || s.url));

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
            // Count how many times this filename has appeared before
            const duplicateCount = sources.slice(0, index)
              .filter(s => s.filename === source.filename).length;
            
            // If this is a duplicate filename, add a number
            const displayName = source.filename ? 
              (duplicateCount > 0 ? `${source.filename} (${duplicateCount + 1})` : source.filename) : 
              source.url;
            
            return (
              <li key={index}>
                <a href={source.url} target="_blank" rel="noreferrer" title={source.url}>
                  {displayName}
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="external-link-icon"
                    style={{ marginLeft: '4px' }}
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
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