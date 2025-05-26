import React, { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSetAtom } from "jotai";
import { showToastAtom } from "../../atoms/toastState";
import "../../styles/pages/_DocumentUpload.scss";

interface UploadedFile extends File {
  id: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  response?: any;
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
  documents: MorphikDocument[];
  errors: any[];
}

const DocumentUpload: React.FC = () => {
  const { t } = useTranslation();
  const showToast = useSetAtom(showToastAtom);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [folderName, setFolderName] = useState("test");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateFileId = () => Math.random().toString(36).slice(2, 11);

  const normalizeFolderName = (name: string): string => {
    if (!name.trim()) {
      return "";
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
    );
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        addFiles(selectedFiles);
      }
    },
    []
  );

  const addFiles = useCallback(
    (newFiles: File[]) => {
      // Filter files to only include valid document types
      const validFiles: File[] = [];
      const invalidFiles: { file: File; error: string }[] = [];

      newFiles.forEach((file) => {
        if (isDocumentFile(file)) {
          validFiles.push(file);
        } else {
          invalidFiles.push({ file, error: getFileTypeError(file) });
        }
      });

      // Show error messages for invalid files
      if (invalidFiles.length > 0) {
        const errorMessages = invalidFiles.map(
          ({ file, error }) => `${file.name}: ${error}`
        );
        showToast({
          message: `Some files were rejected:\n${errorMessages.join("\n")}`,
          type: "error",
        });
      }

      // Add valid files to the upload list
      if (validFiles.length > 0) {
        const uploadFiles: UploadedFile[] = validFiles.map((file) => {
          // Use Object.assign to properly extend the File object
          const uploadFile = Object.assign(file, {
            id: generateFileId(),
            progress: 0,
            status: "pending" as const,
          }) as UploadedFile;

          return uploadFile;
        });

        setFiles((prev) => [...prev, ...uploadFiles]);

        if (invalidFiles.length === 0) {
          showToast({
            message: `${validFiles.length} file(s) added successfully`,
            type: "success",
          });
        }
      }
    },
    [showToast]
  );

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  }, []);

  const uploadSingleFile = async (
    file: UploadedFile
  ): Promise<MorphikDocument> => {
    const formData = new FormData();
    formData.append("file", file, file.name);

    if (folderName) {
      formData.append("folder_name", normalizeFolderName(folderName));
    }
    formData.append("use_colpali", "true");

    const response = await fetch("/morphik/ingest/file", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  };

  const uploadBatchFiles = async (
    filesToUpload: UploadedFile[]
  ): Promise<BatchUploadResponse> => {
    const formData = new FormData();

    filesToUpload.forEach((file) => {
      formData.append("files", file, file.name);
    });

    if (folderName) {
      formData.append("folder_name", normalizeFolderName(folderName));
    }
    formData.append("use_colpali", "true");

    const response = await fetch("/morphik/ingest/files", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Batch upload failed: ${response.statusText}`);
    }

    return await response.json();
  };

  const updateFileStatus = useCallback(
    (fileId: string, updates: Partial<UploadedFile>) => {
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? (Object.assign(file, updates) as UploadedFile)
            : file
        )
      );
    },
    []
  );

  const handleUpload = async () => {
    const filesToUpload = files.filter(
      (file) => file.status === "pending" || file.status === "error"
    );
    if (filesToUpload.length === 0) {
      showToast({
        message: "No files to upload",
        type: "warning",
      });
      return;
    }

    setIsUploading(true);

    try {
      if (filesToUpload.length === 1) {
        // Single file upload
        const file = filesToUpload[0];
        updateFileStatus(file.id, {
          status: "uploading",
          progress: 50,
          error: undefined,
        });

        const response = await uploadSingleFile(file);
        updateFileStatus(file.id, {
          status: "completed",
          progress: 100,
          response,
        });

        showToast({
          message: `File "${file.name}" uploaded successfully`,
          type: "success",
        });
      } else {
        // Batch upload
        filesToUpload.forEach((file) => {
          updateFileStatus(file.id, {
            status: "uploading",
            progress: 50,
            error: undefined,
          });
        });

        const response = await uploadBatchFiles(filesToUpload);

        // Update file statuses based on response
        response.documents.forEach((doc, index) => {
          const file = filesToUpload[index];
          if (file) {
            updateFileStatus(file.id, {
              status: "completed",
              progress: 100,
              response: doc,
            });
          }
        });

        // Handle any errors
        if (response.errors && response.errors.length > 0) {
          response.errors.forEach((error, index) => {
            const file = filesToUpload[index];
            if (file && error) {
              updateFileStatus(file.id, {
                status: "error",
                error: JSON.stringify(error),
              });
            }
          });
        }

        showToast({
          message: `Batch upload completed: ${response.documents.length} files uploaded`,
          type: "success",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);

      // Mark files as error
      filesToUpload.forEach((file) => {
        updateFileStatus(file.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        });
      });

      showToast({
        message: `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((file) => file.status !== "completed"));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {
      return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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
    ];

    // Check by MIME type
    if (viewableTypes.includes(file.type)) {
      return true;
    }

    // Check by file extension as fallback
    const extension = file.name.toLowerCase().split(".").pop();
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
    ];

    return extension ? viewableExtensions.includes(extension) : false;
  };

  const handleFileClick = useCallback(
    (file: UploadedFile) => {
      try {
        // Create a temporary URL for the file
        const fileUrl = URL.createObjectURL(file);

        if (isBrowserViewable(file)) {
          // For viewable files, open in new tab for preview
          const newWindow = window.open(fileUrl, "_blank");

          // If popup was blocked, show a toast message
          if (!newWindow) {
            showToast({
              message: "Please allow popups to preview files",
              type: "warning",
            });
          } else {
            showToast({
              message: `Opening ${file.name} for preview`,
              type: "info",
            });
          }
        } else {
          // For non-viewable files, trigger download
          const link = document.createElement("a");
          link.href = fileUrl;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          showToast({
            message: `Downloading ${file.name}`,
            type: "info",
          });
        }

        // Clean up the URL after a short delay to free memory
        setTimeout(() => {
          URL.revokeObjectURL(fileUrl);
        }, 1000);
      } catch (error) {
        console.error("Error handling file:", error);
        showToast({
          message: "Unable to open file",
          type: "error",
        });
      }
    },
    [showToast]
  );

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
    ];

    // Check by MIME type first
    if (allowedMimeTypes.includes(file.type)) {
      return true;
    }

    // Check by file extension as fallback
    const extension = file.name.toLowerCase().split(".").pop();
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
    ];

    return extension ? allowedExtensions.includes(extension) : false;
  };

  const getFileTypeError = (file: File): string => {
    const extension = file.name.toLowerCase().split(".").pop();

    // Check for common application/executable types
    const executableExtensions = [
      "exe",
      "msi",
      "app",
      "deb",
      "rpm",
      "dmg",
      "pkg",
    ];
    if (extension && executableExtensions.includes(extension)) {
      return "Application files are not allowed";
    }

    // Check for archive/zip types
    const archiveExtensions = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"];
    if (extension && archiveExtensions.includes(extension)) {
      return "Archive/zip files are not allowed";
    }

    return "File type not supported. Please upload document files only.";
  };

  return (
    <div className="document-upload">
      <div className="upload-header">
        <h1>{t("documentUpload.title", "Document Upload")}</h1>
        <p>
          {t(
            "documentUpload.description",
            "Upload documents to Morphik document storage for processing and retrieval."
          )}
        </p>
      </div>

      <div className="upload-config">
        <div className="config-row">
          <div className="input-group">
            <label>{t("documentUpload.folderName", "Folder Name")}</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Optional folder name"
            />
          </div>
        </div>
      </div>

      <div
        className={`upload-zone ${isDragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon">📁</div>
        <div className="upload-text">
          <h3>
            {t(
              "documentUpload.dropZoneTitle",
              "Drop files here or click to select"
            )}
          </h3>
          <p>
            {t(
              "documentUpload.dropZoneSubtitle",
              "Supports documents, images (including HEIC), videos, and text files"
            )}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.epub,.txt,.csv,.html,.css,.js,.json,.xml,.md,.markdown,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tiff,.tif,.heic,.heif,.mp4,.mpeg,.mov,.avi,.webm,.mkv,.3gp"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      {files.length > 0 && (
        <div className="files-section">
          <div className="files-header">
            <h3>
              {t("documentUpload.filesSelected", "Selected Files")} (
              {files.length})
            </h3>
            <div className="files-actions">
              <button onClick={clearCompleted} disabled={isUploading}>
                {t("documentUpload.clearCompleted", "Clear Completed")}
              </button>
              <button onClick={clearAll} disabled={isUploading}>
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
                className="upload-button"
              >
                {isUploading
                  ? t("documentUpload.uploading", "Uploading...")
                  : t("documentUpload.upload", "Upload")}
              </button>
            </div>
          </div>

          <div className="files-list">
            {files.map((file) => (
              <div key={file.id} className={`file-item ${file.status}`}>
                <div className="file-info">
                  <div className="file-details">
                    <div
                      className="file-name clickable"
                      onClick={() => handleFileClick(file)}
                      title="Click to open file"
                    >
                      {file.name}
                      <span className="file-size">
                        {" "}
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    {file.error && (
                      <div className="file-error">{file.error}</div>
                    )}
                  </div>
                </div>
                <div className="file-actions">
                  {file.status === "uploading" && (
                    <div className="progress-container">
                      <div className="loading-spinner"></div>
                    </div>
                  )}
                  {file.status === "pending" && (
                    <div className="progress-container">
                      <button
                        onClick={() => removeFile(file.id)}
                        className="remove-button-small"
                        disabled={isUploading}
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {file.status === "error" && (
                    <div className="progress-container">
                      <button
                        onClick={() => removeFile(file.id)}
                        className="remove-button-small"
                        disabled={isUploading}
                        title="Remove failed file"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {file.status === "completed" && file.response && (
                    <div className="file-success">
                      <small>ID: {file.response.external_id}</small>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
