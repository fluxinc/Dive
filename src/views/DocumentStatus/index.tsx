import React, { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useSetAtom } from "jotai"
import { showToastAtom } from "../../atoms/toastState"
import DocumentList, { Document, TabStatus } from "./DocumentList"
import "../../styles/pages/_DocumentUpload.scss" // Reuse styles for consistency

// Page limit constant for pagination
const PAGE_LIMIT = 20

interface PageMetadata {
  total: number;
  skip: number;
  limit: number;
  current_page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Helper function to build PageMetadata from total count and current page
const buildPageMetadata = (total: number, currentPage: number, limit: number): PageMetadata => {
  const totalPages = Math.ceil(total / limit)
  const skip = currentPage * limit
  
  return {
    total,
    skip,
    limit,
    current_page: currentPage,
    total_pages: totalPages,
    has_next: currentPage < totalPages - 1,
    has_previous: currentPage > 0
  }
}

// Simplified interface - only total count is provided by API
interface DocumentsResponse {
  documents: Document[];
  total: number;
}

const DocumentStatus: React.FC = () => {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState<Document[]>([])
  const [pagination, setPagination] = useState<PageMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<TabStatus>("completed")
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const showToast = useSetAtom(showToastAtom)

  const fetchDocuments = useCallback(async (status: TabStatus, page: number = 0) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/documents?page=${page}&limit=${PAGE_LIMIT}&status=${status}`)
      if (!response.ok) {
        throw new Error("Failed to fetch documents")
      }
      const data: DocumentsResponse = await response.json()
      setDocuments(data.documents)
      setPagination(buildPageMetadata(data.total, page, PAGE_LIMIT))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSelectDoc = (external_id: string) => {
    if (selectedDocs.includes(external_id)) {
      setSelectedDocs(selectedDocs.filter((d) => d !== external_id))
    } else {
      setSelectedDocs([...selectedDocs, external_id])
    }
  }

  const handleDeleteSelected = async () => {
    setDeletingIds((prev) => [...prev, ...selectedDocs])
    for (const external_id of selectedDocs) {
      try {
        const response = await fetch(`/api/documents/${external_id}`, {
          method: "DELETE",
        })
        if (!response.ok) {
          throw new Error("Failed to delete document")
        }
      } catch (err) {
        showToast({
          message: err instanceof Error ? err.message : "An unknown error occurred",
          type: "error",
        })
      } 
    }
    setDeletingIds((prev) => prev.filter(id => !selectedDocs.includes(id)))
    setSelectedDocs([])
    // Refetch documents for the current tab to reflect the deletion
    fetchDocuments(activeTab, currentPage)
  }

  const handleTabChange = (newTab: TabStatus) => {
    setActiveTab(newTab)
    setCurrentPage(0) // Reset to first page when changing tabs
    setSelectedDocs([])
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handlePreviousPage = () => {
    if (pagination?.has_previous) {
      const newPage = Math.max(0, currentPage - 1)
      handlePageChange(newPage)
    }
  }

  const handleNextPage = () => {
    if (pagination?.has_next) {
      const newPage = currentPage + 1
      handlePageChange(newPage)
    }
  }

  useEffect(() => {
    fetchDocuments(activeTab, currentPage)
  }, [activeTab, currentPage, fetchDocuments])

  const renderPaginationInfo = () => {
    if (!pagination || pagination.total === 0) {
      return null
    }

    const startItem = pagination.skip + 1
    const endItem = Math.min(pagination.skip + pagination.limit, pagination.total)

    return (
      <div className="pagination-info">
        <span>
          Showing {startItem} - {endItem} of {pagination.total} documents
        </span>
      </div>
    )
  }

  const renderPaginationControls = () => {
    if (!pagination || pagination.total_pages <= 1) {
      return null
    }

    return (
      <div className="pagination-controls">
        <span
          onClick={pagination.has_previous ? handlePreviousPage : undefined}
          className={`pagination-btn ${!pagination.has_previous ? "disabled" : ""}`}
        >
          ← Previous
        </span>
        <span className="page-info">
          Page {pagination.current_page + 1} of {pagination.total_pages}
        </span>
        <span
          onClick={pagination.has_next ? handleNextPage : undefined}
          className={`pagination-btn ${!pagination.has_next ? "disabled" : ""}`}
        >
          Next →
        </span>
      </div>
    )
  }

  return (
    <div className="main-container document-status-page">
      <h1>{t("documentStatus.title", "Document Status")}</h1>

      {error && <p className="error-message">{error}</p>}

      <div className="document-tabs">
        <button onClick={() => handleTabChange("completed")} className={activeTab === "completed" ? "active" : ""}>Completed</button>
        <button onClick={() => handleTabChange("processing")} className={activeTab === "processing" ? "active" : ""}>Processing</button>
        <button onClick={() => handleTabChange("failed")} className={activeTab === "failed" ? "active" : ""}>Failed</button>
        {renderPaginationInfo()}
      </div>

      <div className="document-status-section">
        <button className="delete-btn" disabled={selectedDocs.length === 0} onClick={handleDeleteSelected}>Delete selected</button>

        <DocumentList
          documents={documents}
          deletingIds={deletingIds}
          isLoading={isLoading}
          handleSelectDoc={handleSelectDoc}
          selectedDocs={selectedDocs}
        />

        {!isLoading && documents.length === 0 && (
          <p>No documents found.</p>
        )}

        {!isLoading && documents.length > 0 && (
          renderPaginationControls()
        )}
      </div>
    </div>
  )
}

export default DocumentStatus