import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://knowledgescout-1-ta2t.onrender.com';

function DocumentsList({ token }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.get(`${API_URL}/docs?limit=${limit}&offset=${offset}`, config);
      setDocuments(response.data.documents);
      setTotal(response.data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [offset, token]);

  const handleViewDocument = async (docId) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.get(`${API_URL}/docs/${docId}`, config);
      setSelectedDoc(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load document');
    }
  };

  const handleShare = async (shareToken) => {
    const shareUrl = `${window.location.origin}/api/docs/${selectedDoc.id}?shareToken=${shareToken}`;
    await navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <div className="loading">Loading documents...</div>;

  return (
    <div className="documents-container">
      <h1>Documents Library</h1>
      {error && <div className="message error">{error}</div>}

      <div className="documents-header">
        <p>Total documents: {total}</p>
        <div className="pagination-controls">
          <button 
            className="btn btn-secondary" 
            disabled={offset === 0}
            onClick={() => setOffset(prev => Math.max(0, prev - limit))}
          >
            ← Previous
          </button>
          <span>Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
          <button 
            className="btn btn-secondary"
            disabled={offset + limit >= total}
            onClick={() => setOffset(prev => prev + limit)}
          >
            Next →
          </button>
        </div>
      </div>

      <div className="documents-grid">
        {documents.map(doc => (
          <div key={doc.id} className="document-card">
            <div className="doc-header">
              <h3>{doc.title}</h3>
              {doc.isPrivate && <span className="private-badge">Private</span>}
              {doc.isOwner && <span className="owner-badge">Owner</span>}
            </div>
            
            <div className="doc-meta">
              <div className="meta-item">
                <strong>Filename:</strong> {doc.filename}
              </div>
              <div className="meta-item">
                <strong>Size:</strong> {formatFileSize(doc.size)}
              </div>
              <div className="meta-item">
                <strong>Pages:</strong> {doc.pageCount}
              </div>
              <div className="meta-item">
                <strong>Uploaded:</strong> {formatDate(doc.uploadedAt)}
              </div>
            </div>

            <div className="doc-actions">
              <button 
                className="btn btn-primary"
                onClick={() => handleViewDocument(doc.id)}
              >
                👁️ View
              </button>
              {doc.isPrivate && doc.isOwner && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/api/docs/${doc.id}?shareToken=${doc.shareToken}`;
                    navigator.clipboard.writeText(shareUrl);
                    alert('Share link copied to clipboard!');
                  }}
                >
                  🔗 Share
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && !loading && (
        <div className="empty-state">
          <h3>No documents found</h3>
          <p>Upload some documents to get started!</p>
        </div>
      )}

      {selectedDoc && (
        <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDoc.title}</h2>
              <button className="close-btn" onClick={() => setSelectedDoc(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="doc-info">
                <p><strong>Filename:</strong> {selectedDoc.filename}</p>
                <p><strong>Size:</strong> {formatFileSize(selectedDoc.size)}</p>
                <p><strong>Uploaded:</strong> {formatDate(selectedDoc.uploadedAt)}</p>
                <p><strong>Pages:</strong> {selectedDoc.pages?.length || 0}</p>
                {selectedDoc.isPrivate && selectedDoc.shareToken && (
                  <div className="share-section">
                    <p><strong>Share Token:</strong> {selectedDoc.shareToken}</p>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleShare(selectedDoc.shareToken)}
                    >
                      📋 Copy Share Link
                    </button>
                  </div>
                )}
              </div>

              <div className="doc-content">
                <h3>Content Preview</h3>
                <div className="content-preview">
                  {selectedDoc.pages?.map((page, index) => (
                    <div key={index} className="page-section">
                      <h4>Page {page.pageNumber}</h4>
                      <div className="page-content">
                        {page.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentsList;