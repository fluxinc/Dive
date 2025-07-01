import React, { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useSetAtom } from "jotai"
import { showToastAtom } from "../../atoms/toastState"
import DocumentList, { Document, TabStatus } from "./DocumentList"
import "../../styles/pages/_DocumentUpload.scss" // Reuse styles for consistency

const DocumentStatus: React.FC = () => {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<TabStatus>("completed")
  const showToast = useSetAtom(showToastAtom)

  const fetchDocuments = useCallback(async (status: TabStatus) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/documents?status=${status}`) // Fetch documents for the active tab
      if (!response.ok) {
        throw new Error("Failed to fetch documents")
      }
      const data = await response.json()
      setDocuments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDelete = async (external_id: string) => {
    setDeletingIds((prev) => [...prev, external_id])
    try {
      const response = await fetch(`/api/documents/${external_id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to delete document")
      }
      // Refetch documents for the current tab to reflect the deletion
      fetchDocuments(activeTab)
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "An unknown error occurred",
        type: "error",
      })
    } finally {
      setDeletingIds((prev) => prev.filter(id => id !== external_id))
    }
  }

  useEffect(() => {
    fetchDocuments(activeTab)
  }, [activeTab, fetchDocuments])

  // useEffect(() => {
  //   fetchDocuments();
  //   // Optional: set up polling to refresh the document statuses
  //   const interval = setInterval(fetchDocuments, 10000); // every 10 seconds
  //   return () => clearInterval(interval);
  // }, []);

  return (
    <div className="main-container document-status-page">
      <h1>{t("documentStatus.title", "Document Status")}</h1>
      {isLoading && <p>Loading documents...</p>}
      {error && <p className="error-message">{error}</p>}
      
      <div className="document-status-sections">
        {!isLoading && documents.length > 0 && (
          <DocumentList 
            documents={documents} 
            handleDelete={handleDelete} 
            deletingIds={deletingIds}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isLoading={isLoading}
          />
        )}
        {!isLoading && documents.length === 0 && (
            <p>No documents found.</p>
        )}
      </div>
    </div>
  )
}

export default DocumentStatus