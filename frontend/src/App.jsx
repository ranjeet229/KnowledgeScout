// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';
import DocumentsList from './components/DocumentsList';
import AskQuestion from './components/AskQuestion';
import Admin from './components/Admin';
import Login from './components/Login';
import Register from './components/Register';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              📚 KnowledgeScout
            </Link>
            <ul className="nav-menu">
              <li className="nav-item">
                <Link to="/docs" className="nav-link">Documents</Link>
              </li>
              <li className="nav-item">
                <Link to="/ask" className="nav-link">Ask Question</Link>
              </li>
              {token && (
                <li className="nav-item">
                  <Link to="/admin" className="nav-link">Admin</Link>
                </li>
              )}
              {!token ? (
                <>
                  <li className="nav-item">
                    <Link to="/login" className="nav-link">Login</Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/register" className="nav-link">Register</Link>
                  </li>
                </>
              ) : (
                <li className="nav-item">
                  <button onClick={handleLogout} className="nav-link logout-btn">
                    Logout ({user?.username})
                  </button>
                </li>
              )}
            </ul>
          </div>
        </nav>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/docs" element={<DocumentsList token={token} />} />
            <Route path="/ask" element={<AskQuestion token={token} />} />
            <Route 
              path="/admin" 
              element={token ? <Admin token={token} /> : <Navigate to="/login" />} 
            />
            <Route path="/login" element={<Login setToken={setToken} setUser={setUser} />} />
            <Route path="/register" element={<Register setToken={setToken} setUser={setUser} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div className="home">
      <div className="hero">
        <h1>Welcome to KnowledgeScout</h1>
        <p>Your intelligent document Q&A system</p>
        <div className="hero-buttons">
          <Link to="/docs" className="btn btn-primary">Browse Documents</Link>
          <Link to="/ask" className="btn btn-secondary">Ask a Question</Link>
        </div>
      </div>
      <div className="features">
        <div className="feature-card">
          <h3>📄 Upload Documents</h3>
          <p>Upload and manage your documents with ease</p>
        </div>
        <div className="feature-card">
          <h3>🔍 Smart Search</h3>
          <p>Find relevant information across all documents</p>
        </div>
        <div className="feature-card">
          <h3>🔒 Privacy Control</h3>
          <p>Keep documents private or share via token</p>
        </div>
      </div>
    </div>
  );
}

export default App;