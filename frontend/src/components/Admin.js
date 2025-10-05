// src/components/Admin.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function Admin({ token }) {
  const [stats, setStats] = useState(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/index/stats`);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (!title && selectedFile) {
      setTitle(selectedFile.name);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('isPrivate', isPrivate);

      const response = await axios.post(`${API_URL}/docs`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setMessage({ 
        type: 'success', 
        text: `Document uploaded successfully! ${response.data.shareToken ? `Share Token: ${response.data.shareToken}` : ''}` 
      });
      setFile(null);
      setTitle('');
      setIsPrivate(false);
      document.getElementById('file-input').value = '';
      fetchStats();
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to upload document' 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRebuild = async () => {
    try {
      setRebuilding(true);
      await axios.post(`${API_URL}/index/rebuild`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Index rebuilt successfully!' });
      fetchStats();
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to rebuild index' 
      });
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <div className="admin-container">
      <h1>⚙️ Admin Panel</h1>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button className="close-btn" onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      <div className="admin-grid">
        <div className="admin-card">
          <h2>📊 Index Statistics</h2>
          {stats ? (
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{stats.totalDocuments}</div>
                <div className="stat-label">Total Documents</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.totalPages}</div>
                <div className="stat-label">Total Pages</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">v{stats.indexVersion}</div>
                <div className="stat-label">Index Version</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {new Date(stats.lastRebuilt).toLocaleString()}
                </div>
                <div className="stat-label">Last Rebuilt</div>
              </div>
            </div>
          ) : (
            <p>Loading statistics...</p>
          )}
          <button 
            className="btn btn-secondary" 
            onClick={handleRebuild}
            disabled={rebuilding}
          >
            {rebuilding ? 'Rebuilding...' : '🔄 Rebuild Index'}
          </button>
        </div>

        <div className="admin-card">
          <h2>📤 Upload Document</h2>
          <form onSubmit={handleUpload} className="upload-form">
            <div className="form-group">
              <label htmlFor="file-input">Select File:</label>
              <input
                type="file"
                id="file-input"
                onChange={handleFileChange}
                accept=".txt,.pdf,.doc,.docx"
                className="file-input"
              />
              {file && (
                <div className="file-info">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="title">Document Title:</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title"
                className="input-field"
                required
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <span>Make this document private</span>
              </label>
              <small>Private documents are only visible to you and users with a share token</small>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={uploading || !file}
            >
              {uploading ? 'Uploading...' : '📤 Upload Document'}
            </button>
          </form>
        </div>
      </div>

      <div className="admin-card full-width">
        <h2>📖 Usage Instructions</h2>
        <div className="instructions">
          <div className="instruction-item">
            <h3>1. Upload Documents</h3>
            <p>Upload text files (.txt) containing your knowledge base. Each document will be indexed automatically.</p>
          </div>
          <div className="instruction-item">
            <h3>2. Rebuild Index</h3>
            <p>Click "Rebuild Index" to refresh the search index after uploading multiple documents.</p>
          </div>
          <div className="instruction-item">
            <h3>3. Private Documents</h3>
            <p>Mark documents as private to restrict access. You'll receive a share token that others can use to view the document.</p>
          </div>
          <div className="instruction-item">
            <h3>4. Query Documents</h3>
            <p>Use the "Ask Question" page to search across all documents. Results are cached for 60 seconds for faster responses.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;