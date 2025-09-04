import React, { useState, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useSetAtom } from "jotai"
import { showToastAtom } from "../../atoms/toastState"
import "../../styles/pages/_DocumentUpload.scss"

interface UploadedFile extends File {
  id: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  response?: MorphikDocument;
  error?: string;
}

interface MorphikDocument {
  external_id: string;
  filename: string;
  content_type: string;
  metadata: any;
  storage_info: any;
  chunk_ids: string[];
}

interface BatchUploadResponse {
  message: string;
  failed_documents: MorphikDocument[];
}

interface CrawledUrl {
  url: string;
  selected: boolean;
  status?: "pending" | "ingesting" | "completed" | "error";
  error?: string;
}

interface IngestUrlsResponse {
  message: string;
  successful_urls: string[];
  failed_urls: { url: string; error: string }[];
  skipped_urls: string[];
}

type IngestionMode = "upload" | "crawl" | "urls";

const getFileIcon = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase() || ""
  if (["pdf"].includes(extension)) {
    return "📄"
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return "🖼️"
  }
  if (["doc", "docx"].includes(extension)) {
    return "📝"
  }
  if (["mp4", "mov", "avi"].includes(extension)) {
    return "🎬"
  }
  if (["txt", "md", "json", "xml", "html", "css", "js"].includes(extension)) {
    return ""
  }
  return "📁"
}

const isValidUrl = (urlString: string): boolean => {
  if (!urlString.trim()) {
    return false
  }
  // Regex to check for a protocol. If not present, prepend http://
  if (!/^(?:f|ht)tps?:\/\//.test(urlString)) {
    urlString = "http://" + urlString
  }
  try {
    const url = new URL(urlString)
    // check for a dot in the hostname for public domains, or allow 'localhost'
    return url.hostname.includes(".") || url.hostname === "localhost"
  } catch {
    return false
  }
}

const DocumentUpload: React.FC = () => {
  const { t } = useTranslation()
  const showToast = useSetAtom(showToastAtom)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [folderName, setFolderName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<IngestionMode>("upload")

  // Crawl state
  const [crawlUrl, setCrawlUrl] = useState("")
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawledUrls, setCrawledUrls] = useState<CrawledUrl[]>([])
  const [isIngestingUrls, setIsIngestingUrls] = useState(false)
  const [crawlUrlError, setCrawlUrlError] = useState("")

  // Direct URL state
  const [urlInput, setUrlInput] = useState("")
  const [directUrlsList, setDirectUrlsList] = useState<string[]>([])
  const [urlInputError, setUrlInputError] = useState("")

  const generateFileId = () => Math.random().toString(36).slice(2, 11)

  const normalizeFolderName = (name: string): string => {
    if (!name.trim()) {
      return ""
    }

    return (
      name
        .trim()
        .toLowerCase()
        // Replace spaces and multiple whitespace with hyphens
        .replace(/\s+/g, "-")
        // Remove special characters except hyphens, underscores, and periods
        .replace(/[^a-z0-9\-_.]/g, "")
        // Replace multiple consecutive hyphens with single hyphen
        .replace(/-+/g, "-")
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, "")
    )
  }

  const handleCrawlUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setCrawlUrl(url)
    if (url.trim() && !isValidUrl(url)) {
      setCrawlUrlError("Please enter a valid URL.")
    } else {
      setCrawlUrlError("")
    }
  }

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setUrlInput(url)
    if (url.trim() && !isValidUrl(url)) {
      setUrlInputError("Please enter a valid URL.")
    } else {
      setUrlInputError("")
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files)
        addFiles(selectedFiles)
      }
    },
    []
  )

  const addFiles = useCallback(
    (newFiles: File[]) => {
      // Filter files to only include valid document types
      const validFiles: File[] = []
      const invalidFiles: { file: File; error: string }[] = []

      newFiles.forEach((file) => {
        if (isDocumentFile(file)) {
          validFiles.push(file)
        } else {
          invalidFiles.push({ file, error: getFileTypeError(file) })
        }
      })

      // Show error messages for invalid files
      if (invalidFiles.length > 0) {
        const errorMessages = invalidFiles.map(
          ({ file, error }) => `${file.name}: ${error}`
        )
        showToast({
          message: `Some files were rejected:\n${errorMessages.join("\n")}`,
          type: "error",
        })
      }

      // Add valid files to the upload list
      if (validFiles.length > 0) {
        const uploadFiles: UploadedFile[] = validFiles.map((file) => {
          // Use Object.assign to properly extend the File object
          const uploadFile = Object.assign(file, {
            id: generateFileId(),
            progress: 0,
            status: "pending" as const,
          }) as UploadedFile

          return uploadFile
        })

        setFiles((prev) => [...prev, ...uploadFiles])

        if (invalidFiles.length === 0) {
          showToast({
            message: `${validFiles.length} file(s) added successfully`,
            type: "success",
          })
        }
      }
    },
    [showToast]
  )

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }, [])

  const uploadSingleFile = async (
    file: UploadedFile
  ): Promise<MorphikDocument> => {
    const formData = new FormData()
    formData.append("files", file, file.name)

    if (folderName) {
      formData.append("folder_name", normalizeFolderName(folderName))
    }
    formData.append("use_colpali", "true")

    const response = await fetch("/api/ingestion/ingest_files", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    return await response.json()
  }

  const uploadBatchFiles = async (
    filesToUpload: UploadedFile[]
  ): Promise<BatchUploadResponse> => {
    const formData = new FormData()

    filesToUpload.forEach((file) => {
      formData.append("files", file, file.name)
    })

    if (folderName) {
      formData.append("folder_name", normalizeFolderName(folderName))
    }
    formData.append("use_colpali", "true")

    const response = await fetch("/api/ingestion/ingest_files", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Batch upload failed: ${response.statusText}`)
    }

    return await response.json()
  }

  const updateFileStatus = useCallback(
    (fileId: string, updates: Partial<UploadedFile>) => {
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? (Object.assign(file, updates) as UploadedFile)
            : file
        )
      )
    },
    []
  )

  const handleUpload = async () => {
    const filesToUpload = files.filter(
      (file) => file.status === "pending" || file.status === "error"
    )
    if (filesToUpload.length === 0) {
      showToast({
        message: "No files to upload",
        type: "warning",
      })
      return
    }
    
    setIsUploading(true)
    
    try {
      if (filesToUpload.length === 1) {
        // Single file upload
        const file = filesToUpload[0]
        updateFileStatus(file.id, {
          status: "uploading",
          progress: 50,
        })
        
        const response = await uploadSingleFile(file)
        updateFileStatus(file.id, {
          status: "completed",
          progress: 100,
          response,
        })
        
        showToast({
          message: `File "${file.name}" uploaded successfully`,
          type: "success",
        })
      } else {
        // Batch upload
        filesToUpload.forEach((file) => {
          updateFileStatus(file.id, {
            status: "uploading",
            progress: 50,
          })
        })
        const response: BatchUploadResponse = await uploadBatchFiles(filesToUpload)
        console.log(response)
        // Update file statuses based on response
        filesToUpload.forEach((file) => {
          const failedDoc = response.failed_documents.find(
            (doc) => doc.filename === file.name
          );
          if (failedDoc) {
            updateFileStatus(file.id, {
              status: "error",
              progress: 100,
              error: "Upload failed.",
              response: failedDoc,
            });
          } else {
            updateFileStatus(file.id, {
              status: "completed",
              progress: 100,
            });
          }
        });

        showToast({
          message: response.message,
          type: response.failed_documents.length > 0 ? "warning" : "success",
        });
      }
    } catch (error) {
      console.error("Upload error:", error)

      // Mark files as error
      filesToUpload.forEach((file) => {
        updateFileStatus(file.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        })
      })

      showToast({
        message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"
          }`,
        type: "error",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCrawlSite = async () => {
    if (!crawlUrl.trim() || !isValidUrl(crawlUrl)) {
      showToast({ message: "Please enter a valid URL to crawl.", type: "warning" })
      setCrawlUrlError("Please enter a valid URL.")
      return
    }
    setIsCrawling(true)
    setCrawledUrls([])
    let crawlUrlToUse = crawlUrl
    // Regex to check for a protocol. If not present, prepend http://
    if (!/^(?:f|ht)tps?:\/\//.test(crawlUrlToUse)) {
      crawlUrlToUse = "http://" + crawlUrlToUse
    }
    showToast({ message: `Crawling ${crawlUrl}...`, type: "info" })
    try {
      const formData = new FormData()
      formData.append("site", crawlUrlToUse)

      const response = await fetch("/api/ingestion/crawl_site", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `Crawl failed: ${response.statusText}`
        )
      }

      const result = await response.json()
      if (result.urls && result.urls.length > 0) {
        setCrawledUrls(
          result.urls.map((url: string) => ({
            url,
            selected: true,
            status: "pending",
          }))
        )
        showToast({
          message: `Found ${result.urls.length} URLs.`,
          type: "success",
        })
      } else {
        showToast({
          message: "No URLs found at the specified site.",
          type: "warning",
        })
      }
    } catch (error) {
      console.error("Crawl error:", error)
      showToast({
        message: `Crawl failed: ${error instanceof Error ? error.message : "Unknown error"
          }`,
        type: "error",
      })
    } finally {
      setIsCrawling(false)
    }
  }

  const handleIngestUrls = async (
    urlsToIngest: string[],
    source: "crawl" | "direct"
  ) => {
    if (urlsToIngest.length === 0) {
      showToast({ message: "No URLs to ingest.", type: "warning" })
      return
    }

    setIsIngestingUrls(true)

    showToast({
      message: `Ingesting ${urlsToIngest.length} URLs...`,
      type: "info",
    })

    if (source === "crawl") {
      setCrawledUrls((prev) =>
        prev.map((u) =>
          urlsToIngest.includes(u.url) ? { ...u, status: "ingesting" } : u
        )
      )
    }

    try {
      const formData = new FormData()
      urlsToIngest.forEach((url) => formData.append("urls", url))
      if (folderName) {
        formData.append("folder_name", normalizeFolderName(folderName))
      }

      const response = await fetch("/api/ingestion/ingest_urls", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail || `Ingestion failed: ${response.statusText}`
        )
      }

      const result: IngestUrlsResponse = await response.json()
      if (result.failed_urls.length > 0) {
        throw new Error(
          `Ingestion failed: ${result.failed_urls[0].error}`
        )
      } else {
        showToast({ message: result.message, type: "success" })
      }

      if (source === "crawl") {
        setCrawledUrls((prev) =>
          prev.map((u) => {
            if (result.successful_urls.includes(u.url))
              return { ...u, status: "completed" }
            const failed = result.failed_urls.find((f) => f.url === u.url)
            if (failed) {
              return { ...u, status: "error", error: failed.error }
            }
            return u
          })
        )
      } else {
        // Maybe show a summary for direct URL ingestion
        setDirectUrlsList(result.failed_urls.map((f) => f.url))
      }
    } catch (error) {
      console.error("URL Ingestion error:", error)
      showToast({
        message: `Ingestion failed: ${error instanceof Error ? error.message : "Unknown error"
          }`,
        type: "error",
      })
      if (source === "crawl") {
        setCrawledUrls((prev) =>
          prev.map((u) =>
            urlsToIngest.includes(u.url)
              ? {
                ...u,
                status: "error",
                error: error instanceof Error ? error.message : "Failed",
              }
              : u
          )
        )
      }
    } finally {
      setIsIngestingUrls(false)
    }
  }

  const handleAddUrlToList = () => {
    const newUrl = urlInput.trim()
    if (newUrl) {
      if (isValidUrl(newUrl)) {
        if (!directUrlsList.includes(newUrl)) {
          setDirectUrlsList((prev) => [...prev, newUrl])
        }
        setUrlInput("")
        setUrlInputError("")
      } else {
        setUrlInputError("Please enter a valid URL.")
      }
    }
  }

  const handleUrlInputKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddUrlToList()
    }
  }

  const handleRemoveUrl = (urlToRemove: string) => {
    setDirectUrlsList((prev) => prev.filter((url) => url !== urlToRemove))
  }

  const toggleSelectUrl = (url: string) => {
    setCrawledUrls((prev) =>
      prev.map((u) => (u.url === url ? { ...u, selected: !u.selected } : u))
    )
  }

  const toggleSelectAllUrls = () => {
    const allSelected = crawledUrls.every((u) => u.selected)
    setCrawledUrls((prev) =>
      prev.map((u) => ({ ...u, selected: !allSelected }))
    )
  }

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((file) => file.status !== "completed"))
  }, [])

  const clearAll = useCallback(() => {
    setFiles([])
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {
      return "0 Bytes"
    }
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const isBrowserViewable = (file: UploadedFile): boolean => {
    const viewableTypes = [
      // Images
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "image/bmp",
      // PDFs
      "application/pdf",
      // Text files
      "text/plain",
      "text/html",
      "text/css",
      "text/javascript",
      "text/csv",
      // Code files
      "application/json",
      "application/xml",
      "text/xml",
      // Audio/Video (basic support)
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "video/mp4",
      "video/webm",
      "video/ogg",
    ]

    // Check by MIME type
    if (viewableTypes.includes(file.type)) {
      return true
    }

    // Check by file extension as fallback
    const extension = file.name.toLowerCase().split(".").pop()
    const viewableExtensions = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "bmp",
      "pdf",
      "txt",
      "html",
      "css",
      "js",
      "json",
      "xml",
      "csv",
      "mp3",
      "wav",
      "ogg",
      "mp4",
      "webm",
    ]

    return extension ? viewableExtensions.includes(extension) : false
  }

  const handleFileClick = useCallback(
    (file: UploadedFile) => {
      try {
        // Create a temporary URL for the file
        const fileUrl = URL.createObjectURL(file)

        if (isBrowserViewable(file)) {
          // For viewable files, open in new tab for preview
          const newWindow = window.open(fileUrl, "_blank")

          // If popup was blocked, show a toast message
          if (!newWindow) {
            showToast({
              message: "Please allow popups to preview files",
              type: "warning",
            })
          } else {
            showToast({
              message: `Opening ${file.name} for preview`,
              type: "info",
            })
          }
        } else {
          // For non-viewable files, trigger download
          const link = document.createElement("a")
          link.href = fileUrl
          link.download = file.name
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          showToast({
            message: `Downloading ${file.name}`,
            type: "info",
          })
        }

        // Clean up the URL after a short delay to free memory
        setTimeout(() => {
          URL.revokeObjectURL(fileUrl)
        }, 1000)
      } catch (error) {
        console.error("Error handling file:", error)
        showToast({
          message: "Unable to open file",
          type: "error",
        })
      }
    },
    [showToast]
  )

  const isDocumentFile = (file: File): boolean => {
    // Define allowed document MIME types
    const allowedMimeTypes = [
      // PDF
      "application/pdf",
      // Microsoft Office
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      // OpenDocument
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/vnd.oasis.opendocument.presentation",
      // Text files
      "text/plain",
      "text/csv",
      "text/html",
      "text/css",
      "text/javascript",
      "text/markdown",
      "application/json",
      "application/xml",
      "text/xml",
      // Images
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "image/bmp",
      "image/tiff",
      "image/heic",
      "image/heif",
      // Videos
      "video/mp4",
      "video/mpeg",
      "video/mov",
      "video/avi",
      "video/webm",
      "video/mkv",
      "video/3gp",
      // Rich Text Format
      "application/rtf",
      // eBooks
      "application/epub+zip",
    ]

    // Check by MIME type first
    if (allowedMimeTypes.includes(file.type)) {
      return true
    }

    // Check by file extension as fallback
    const extension = file.name.toLowerCase().split(".").pop()
    const allowedExtensions = [
      // Documents
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "odt",
      "ods",
      "odp",
      "rtf",
      "epub",
      // Text
      "txt",
      "csv",
      "html",
      "css",
      "js",
      "json",
      "xml",
      "md",
      "markdown",
      "yml",
      "yaml",
      // Images
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "bmp",
      "tiff",
      "tif",
      "heic",
      "heif",
      // Videos
      "mp4",
      "mpeg",
      "mov",
      "avi",
      "webm",
      "mkv",
      "3gp",
    ]

    return extension ? allowedExtensions.includes(extension) : false
  }

  const getFileTypeError = (file: File): string => {
    const extension = file.name.toLowerCase().split(".").pop()

    // Check for common application/executable types
    const executableExtensions = [
      "exe",
      "msi",
      "app",
      "deb",
      "rpm",
      "dmg",
      "pkg",
    ]
    if (extension && executableExtensions.includes(extension)) {
      return "Application files are not allowed"
    }

    // Check for archive/zip types
    const archiveExtensions = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"]
    if (extension && archiveExtensions.includes(extension)) {
      return "Archive/zip files are not allowed"
    }

    return "File type not supported. Please upload document files only."
  }

  const getSelectedCrawledUrls = () =>
    crawledUrls.filter((u) => u.selected).map((u) => u.url)

  return (
    <div className="main-container document-upload-page">
      <h1>{t("documentUpload.title", "Document Upload")}</h1>

      <div className="controls">
        <div className="folder-input">
          <label>{t("documentUpload.folderName", "Folder Name (optional)")}</label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Enter folder name"
          />
        </div>
        <div className="action-buttons">
          <button className={mode === "upload" ? "active-mode" : ""} onClick={() => setMode("upload")}>Upload Files</button>
          <button className={mode === "crawl" ? "active-mode" : ""} onClick={() => setMode("crawl")}>Crawl Site</button>
          <button className={mode === "urls" ? "active-mode" : ""} onClick={() => setMode("urls")}>Ingest URLs</button>
        </div>
      </div>

      <div className="upload-section">
      {mode === "upload" && (
        <div className={`upload-zone ${isDragOver ? "drag-over" : ""}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
            <p>📂 Drop files here or <span className="clickable">click to browse</span></p>
            <p>Supports documents, images, videos, and text files</p>
          <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} style={{ display: "none" }} />
        </div>
      )}

      {mode === "crawl" && (
        <div className="crawl-section">
          <div className="input-group">
            <label>Site URL to Crawl</label>
            <input
              type="text"
              value={crawlUrl}
              onChange={handleCrawlUrlChange}
              placeholder="e.g., https://example.com"
              disabled={isCrawling || isIngestingUrls}
            />
            {crawlUrlError && <div className="input-error">{crawlUrlError}</div>}
          </div>
          <button onClick={handleCrawlSite} disabled={isCrawling || isIngestingUrls || !crawlUrl.trim() || !!crawlUrlError} className="secondary-button">
            {isCrawling ? "Crawling..." : "Crawl"}
          </button>
        </div>
      )}

      {mode === "urls" && (
        <div className="urls-section">
          <div className="input-group">
            <label>URL to Ingest</label>
            <div className="url-input-container">
              <input
                type="text"
                value={urlInput}
                onChange={handleUrlInputChange}
                onKeyDown={handleUrlInputKeydown}
                placeholder="https://example.com/page"
                disabled={isIngestingUrls}
              />
              <button onClick={handleAddUrlToList} disabled={isIngestingUrls || !urlInput.trim() || !!urlInputError} className="secondary-button">
                Add
              </button>
            </div>
            {urlInputError && <div className="input-error">{urlInputError}</div>}
          </div>
        </div>
      )}
      </div>


      {/* -- Files List for Upload -- */}
      {files.length > 0 && mode === "upload" && (
        <div className="file-list">
          <div className="file-list-header">
            <h2>
              {t("documentUpload.filesSelected", "Selected Files")} (
              {files.length})
            </h2>
            <div className="file-actions">
              <button onClick={clearCompleted} disabled={isUploading}>
                {t("documentUpload.clearCompleted", "Clear Completed")}
              </button>
              <button
                onClick={clearAll}
                disabled={isUploading}
              >
                {t("documentUpload.clearAll", "Clear All")}
              </button>
              <button
                onClick={handleUpload}
                disabled={
                  isUploading ||
                  files.filter(
                    (f) => f.status === "pending" || f.status === "error"
                  ).length === 0
                }
                className="primary"
              >
                {isUploading
                  ? t("documentUpload.uploading", "Uploading...")
                  : t("documentUpload.upload", "Upload")}
              </button>
            </div>
          </div>

          <ul>
            {files.map((file) => (
              <li key={file.id} className={`file-item ${file.status}`}>
                <div className="file-info" onClick={() => handleFileClick(file)}
                      title="Click to open file">
                    <span className="file-icon">{getFileIcon(file.name)}</span>
                    {file.name}
                </div>
                {file.status === "error" && (
                  <div className="file-error">{file.error}</div>
                )}
                <span className="file-size">
                  {formatFileSize(file.size)}
                </span>
                <div className="file-actions">
                  {file.status === "uploading" && (
                    <div className="progress-container">
                      <div className="loading-spinner"></div>
                    </div>
                  )}
                  {file.status === "pending" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(file.id)
                      }}
                      className="remove-button"
                      disabled={isUploading}
                      title="Remove file"
                    >
                      ×
                    </button>
                  )}
                  {file.status === "error" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(file.id)
                      }}
                      className="remove-button"
                      disabled={isUploading}
                      title="Remove failed file"
                    >
                      ×
                    </button>
                  )}
                  {file.status === "completed" && file.response && (
                    <div className="file-success" title={`ID: ${file.response.external_id}`}>
                      ✓
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* -- URL List for Crawl -- */}
      {crawledUrls.length > 0 && mode === "crawl" && (
        <div className="file-list">
          <div className="file-list-header">
            <h2>Found URLs ({crawledUrls.length})</h2>
            <div className="file-actions">
              <button
                onClick={toggleSelectAllUrls}
                disabled={isIngestingUrls}
              >
                {crawledUrls.every((u) => u.selected)
                  ? "Deselect All"
                  : "Select All"}
              </button>
              <button
                onClick={() =>
                  handleIngestUrls(getSelectedCrawledUrls(), "crawl")
                }
                disabled={
                  isIngestingUrls || getSelectedCrawledUrls().length === 0
                }
                className="primary"
              >
                {isIngestingUrls
                  ? "Ingesting..."
                  : `Ingest Selected (${getSelectedCrawledUrls().length})`}
              </button>
            </div>
          </div>
          <ul>
            {crawledUrls.map((crawledUrl) => (
              <li
                key={crawledUrl.url}
                className={`file-item ${crawledUrl.status || "pending"}`}
              >
                <input
                  type="checkbox"
                  checked={crawledUrl.selected}
                  onChange={() => toggleSelectUrl(crawledUrl.url)}
                  disabled={isIngestingUrls}
                />
                <div className="file-info">
                    <a className="file-name" title={crawledUrl.url} href={crawledUrl.url} target="_blank" rel="noopener noreferrer">
                      {crawledUrl.url}
                    </a>
                    {crawledUrl.error && (
                      <div className="file-error">{crawledUrl.error}</div>
                    )}
                </div>
                <div className="file-actions">
                  {crawledUrl.status === "ingesting" && (
                    <div className="loading-spinner"></div>
                  )}
                  {crawledUrl.status === "completed" && (
                    <div className="file-success">✓</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* -- URL List for Direct Add -- */}
      {directUrlsList.length > 0 && mode === "urls" && (
        <div className="file-list">
          <div className="file-list-header">
            <h2>URLs to Ingest ({directUrlsList.length})</h2>
            <div className="file-actions">
              <button
                onClick={() => handleIngestUrls(directUrlsList, "direct")}
                disabled={isIngestingUrls || directUrlsList.length === 0}
                className="primary"
              >
                {isIngestingUrls
                  ? `Ingesting ${directUrlsList.length} URLs...`
                  : `Ingest ${directUrlsList.length} URLs`}
              </button>
            </div>
          </div>

          <ul>
            {directUrlsList.map((url, index) => (
              <li key={index} className="file-item">
                <div className="file-info">
                    <div className="file-name" title={url}>
                      {url}
                    </div>
                </div>
                <div className="file-actions">
                  <button
                    onClick={() => handleRemoveUrl(url)}
                    className="remove-button"
                    disabled={isIngestingUrls}
                    title="Remove URL"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  )
}

export default DocumentUpload
