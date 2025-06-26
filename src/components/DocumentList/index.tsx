import React from "react";
import "./DocumentList.scss";

export interface Document {
  external_id: string;
  filename: string;
  content_type: string;
  metadata: any;
  system_metadata: {
    status: 'processing' | 'completed' | 'failed' | 'unknown';
    error?: string;
    [key: string]: any;
  };
  size?: number; // Optional size in bytes
}

interface DocumentListProps {
  documents: Document[];
}

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

const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === 0) {
      return "";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}


const DocumentList: React.FC<DocumentListProps> = ({ documents }) => {
  return (
    <div className="document-list">
      <ul>
        {documents.map((doc) => (
          <li key={doc.external_id} className={`document-item ${doc.system_metadata.status}`}>
            <div className="document-info">
              <span className="file-icon">{getFileIcon(doc.filename)}</span>
              {doc.filename}
            </div>
            {doc.system_metadata.status === "failed" && (
              <div className="file-error">{doc.system_metadata.error || 'Unknown error'}</div>
            )}
            <span className="file-size">
              {/* The backend doesn't provide size, so this will be empty unless we add it */}
              {formatFileSize(doc.size)}
            </span>
            <div className="file-actions">
              {doc.system_metadata.status === "processing" && (
                <div className="progress-container">
                  <div className="loading-spinner"></div>
                </div>
              )}
              {doc.system_metadata.status === "failed" && (
                 <div className="file-error-icon" title={doc.system_metadata.error}>
                    ×
                  </div>
              )}
              {doc.system_metadata.status === "completed" && (
                <div className="file-success" title={`ID: ${doc.external_id}`}>
                  ✓
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DocumentList;