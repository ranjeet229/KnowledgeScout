import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'https://knowledgescout-1-ta2t.onrender.com';

function AskQuestion({ token }) {
  const [query, setQuery] = useState('');
  const [k, setK] = useState(5);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError('');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post(`${API_URL}/ask`, { query, k }, config);
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  return (
    <div className="ask-container">
      <h1>Ask Questions</h1>
      <p className="subtitle">Get answers from your documents using AI-powered search</p>

      <form onSubmit={handleSubmit} className="query-form">
        <div className="form-group">
          <label htmlFor="query">Your Question</label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your documents... (e.g., 'What are the main features of the product?', 'Explain the security protocols', etc.)"
            rows="4"
            className="input-field"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="k">Number of Results (1-20)</label>
          <input
            type="number"
            id="k"
            value={k}
            onChange={(e) => setK(Math.min(20, Math.max(1, parseInt(e.target.value) || 5)))}
            min="1"
            max="20"
            className="input-field"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || !query.trim()} 
          className="btn btn-primary"
        >
          {loading ? '🔍 Searching...' : '🤔 Ask Question'}
        </button>
      </form>

      {error && <div className="message error">{error}</div>}

      {results && (
        <div className="results-container">
          <div className="results-header">
            <h2>Answer</h2>
            {results.cached && (
              <span className="cache-badge">🕒 Cached Result</span>
            )}
          </div>
          
          <div className="answer-box">
            <p>{results.answer}</p>
          </div>

          {results.references && results.references.length > 0 ? (
            <div className="references-section">
              <h3>📚 References ({results.references.length})</h3>
              <div className="references-grid">
                {results.references.map((ref, index) => (
                  <div key={index} className="reference-card">
                    <div className="ref-header">
                      <h4>{ref.docTitle}</h4>
                      <span className="page-badge">Page {ref.page}</span>
                    </div>
                    <div 
                      className="snippet"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightText(ref.snippet, query) 
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-results">
              <h3>❌ No references found</h3>
              <p>Try rephrasing your question or uploading more documents.</p>
            </div>
          )}
        </div>
      )}

      <div className="tips-section">
        <h3>💡 Tips for better results:</h3>
        <ul>
          <li>Be specific with your questions</li>
          <li>Use keywords that are likely to appear in your documents</li>
          <li>Try different phrasings if you don't get good results</li>
          <li>Increase the number of results for broader searches</li>
        </ul>
      </div>
    </div>
  );
}

export default AskQuestion;