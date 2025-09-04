import React, { useState } from "react"
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
  deletingIds: string[];
  isLoading: boolean;
  handleSelectDoc: (external_id: string) => void;
  selectedDocs: string[];
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

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  deletingIds,
  isLoading,
  handleSelectDoc,
  selectedDocs,
}) => {
  const documentsToDisplay = React.useMemo(() => {
    return documents.sort((a, b) => a.filename.localeCompare(b.filename));
  }, [documents]);

  return (
    <div className="document-list">
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
                {deletingIds.includes(doc.external_id) ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <input type="checkbox" checked={selectedDocs.includes(doc.external_id)} onChange={() => handleSelectDoc(doc.external_id)} />
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