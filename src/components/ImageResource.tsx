import { useEffect, useState } from "react"
import platform from "../platform"

interface ImageResourceProps {
  src: string
  alt: string
  className?: string
}

/**
 * Component that handles image resources with the img:// protocol
 * Works in both Electron and browser environments
 */
const ImageResource = ({ src, alt, className = "" }: ImageResourceProps) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>("")
  
  useEffect(() => {
    const resolveImagePath = async () => {
      if (src.startsWith("img://")) {
        try {
          // Extract the path part after the protocol
          const path = src.replace("img://", "")
          
          // In Electron, use the platform API to get the actual path
          if (typeof window !== "undefined" && typeof window.ipcRenderer !== "undefined") {
            // For Electron, get the proper file path via IPC
            const resourcePath = await platform.getResourcesPath(path)
            setResolvedSrc(resourcePath)
          } else {
            // For browser, assume the images are in the public directory
            setResolvedSrc(`/assets/${path}`)
          }
        } catch (error) {
          console.error("Failed to resolve image path:", error)
          // Fallback to a default image or path
          setResolvedSrc("/assets/placeholder.svg")
        }
      } else {
        // If it's already a valid URL, use it directly
        setResolvedSrc(src)
      }
    }

    resolveImagePath()
  }, [src])

  if (!resolvedSrc) {
    return null
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
    />
  )
}

export default ImageResource 