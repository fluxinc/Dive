import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import DocumentList, { Document } from "../../components/DocumentList";
import "../../styles/pages/_DocumentUpload.scss"; // Reuse styles for consistency

const DocumentStatus: React.FC = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/documents?limit=100"); // Fetch latest 100, add pagination later
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Optional: set up polling to refresh the document statuses
    const interval = setInterval(fetchDocuments, 10000); // every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const categorizedDocuments = {
    processing: documents.filter(d => d.system_metadata.status === 'processing'),
    failed: documents.filter(d => d.system_metadata.status === 'failed'),
    completed: documents.filter(d => d.system_metadata.status === 'completed'),
  };

  return (
    <div className="main-container document-upload-page">
      <h1>{t("documentStatus.title", "Document Status")}</h1>
      {isLoading && <p>Loading documents...</p>}
      {error && <p className="error-message">{error}</p>}
      
      <div className="document-status-sections">
        {categorizedDocuments.processing.length > 0 && (
          <section>
            <h2>Processing</h2>
            <DocumentList documents={categorizedDocuments.processing} />
          </section>
        )}
        {categorizedDocuments.failed.length > 0 && (
          <section>
            <h2>Failed</h2>
            <DocumentList documents={categorizedDocuments.failed} />
          </section>
        )}
        {categorizedDocuments.completed.length > 0 && (
          <section>
            <h2>Completed</h2>
            <DocumentList documents={categorizedDocuments.completed} />
          </section>
        )}
        {!isLoading && documents.length === 0 && (
            <p>No documents found.</p>
        )}
      </div>
    </div>
  );
};

export default DocumentStatus;