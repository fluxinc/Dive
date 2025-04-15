import React, { useMemo, useState, useEffect } from "react"
import { useTranslation } from 'react-i18next'
import { safeBase64Decode } from "../../util"

interface SourcePanelProps {
  content: string
}

interface SourceItem {
  url: string;
  title?: string;
}

interface SourceWithTitle extends SourceItem {
  fetchedTitle?: string;
  isLoading: boolean;
}

const SourcePanel: React.FC<SourcePanelProps> = ({ content }) => {
  const { t } = useTranslation()
  const [sourcesWithTitles, setSourcesWithTitles] = useState<SourceWithTitle[]>([])
  
  const sourceUrls = useMemo(() => {
    try {
      return JSON.parse(safeBase64Decode(content))
    } catch (e) {
      console.error("Error parsing source URLs:", e)
      return []
    }
  }, [content])

  // Function to get domain from URL
  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '')
      return domain
    } catch {
      return url
    }
  }

  // Fetch website titles when sourceUrls changes
  useEffect(() => {
    if (!sourceUrls.length) return
    
    const initialSources: SourceWithTitle[] = sourceUrls.map((item: string | SourceItem) => {
      const url = typeof item === 'string' ? item : item.url
      const providedTitle = typeof item === 'string' ? undefined : item.title
      
      return {
        url,
        title: providedTitle,
        isLoading: !providedTitle, // Only set loading if we don't already have a title
      }
    })
    
    setSourcesWithTitles(initialSources)
    
    // Fetch titles for sources that don't have them
    initialSources.forEach(async (source, index) => {
      if (source.title) return // Skip if we already have a title
      
      try {
        const response = await fetch(`/api/fetch-title?url=${encodeURIComponent(source.url)}`)
        if (response.ok) {
          const data = await response.json()
          
          setSourcesWithTitles(prev => {
            const updated = [...prev]
            updated[index] = {
              ...updated[index],
              fetchedTitle: data.title,
              isLoading: false
            }
            return updated
          })
        } else {
          setSourcesWithTitles(prev => {
            const updated = [...prev]
            updated[index] = {
              ...updated[index],
              isLoading: false
            }
            return updated
          })
        }
      } catch (error) {
        console.error("Error fetching title:", error)
        setSourcesWithTitles(prev => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            isLoading: false
          }
          return updated
        })
      }
    })
  }, [sourceUrls])

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
          {sourcesWithTitles.map((source, index) => {
            // Display priority: 1. Provided title, 2. Fetched title, 3. Domain name
            const displayText = source.title || source.fetchedTitle || getDomain(source.url)
            
            return (
              <li key={index} className={source.isLoading ? 'loading' : ''}>
                <a href={source.url} target="_blank" rel="noreferrer" title={source.url}>
                  {source.isLoading ? `${getDomain(source.url)}...` : displayText}
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