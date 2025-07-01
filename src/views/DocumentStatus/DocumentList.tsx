import React from "react"
import "../../styles/pages/_DocumentList.scss"

export interface Document {
  external_id: string;
  filename: string;
  content_type: string;
  metadata: any;
  system_metadata: {
    status: "processing" | "completed" | "failed" | "unknown";
    error?: string;
    [key: string]: any;
  };
  size?: number; // Optional size in bytes
}

export type TabStatus = "processing" | "completed" | "failed";

interface DocumentListProps {
  documents: Document[];
  handleDelete: (external_id: string) => void;
  deletingIds: string[];
  activeTab: TabStatus;
  onTabChange: (tab: TabStatus) => void;
  isLoading: boolean;
}

const getFileIcon = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase() || ""
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
      return "🖼️"
    }
    if (["doc", "docx"].includes(extension)) {
      return "📝"
    }
    if (["mp4", "mov", "avi"].includes(extension)) {
      return "🎬"
    }
    if (["pdf", "txt", "md", "json", "xml", "html", "css", "js"].includes(extension)) {
      return "📄"
    }
    return "📄"
}

const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === 0) {
      return ""
    }
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  handleDelete,
  deletingIds,
  activeTab,
  onTabChange,
  isLoading,
}) => {
  const documentsToDisplay = React.useMemo(() => {
    return documents.sort((a, b) => a.filename.localeCompare(b.filename));
  }, [documents]);

  return (
    <div className="document-list">
      <div className="document-tabs">
        <button onClick={() => onTabChange("completed")} className={activeTab === "completed" ? "active" : ""}>Completed</button>
        <button onClick={() => onTabChange("processing")} className={activeTab === "processing" ? "active" : ""}>Processing</button>
        <button onClick={() => onTabChange("failed")} className={activeTab === "failed" ? "active" : ""}>Failed</button>
      </div>
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading documents...</p>
        </div>
      ) : (
        <ul>
          {documentsToDisplay.map((doc) => (
            <li key={doc.external_id} className={`document-item ${doc.system_metadata.status}`}>
              <div className="document-info">
                <span className="file-icon">{getFileIcon(doc.filename)}</span>
                {doc.filename}
              </div>
              {doc.system_metadata.status === "failed" && (
                <div className="file-error" title={doc.system_metadata.error}>{doc.system_metadata.error || "Unknown error"}</div>
              )}
              <div className="file-actions">
                {doc.system_metadata.status === "processing" && (
                  <div className="progress-container">
                    <div className="loading-spinner"></div>
                  </div>
                )}
                {doc.system_metadata.status === "failed" && (
                  deletingIds.includes(doc.external_id) ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(doc.external_id)}
                    >
                      Delete
                    </button>
                  )
                )}
                {doc.system_metadata.status === "completed" && (
                  <div className="file-success">
                    ✓
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default DocumentList