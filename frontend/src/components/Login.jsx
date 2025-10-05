import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'https://knowledgescout-1-ta2t.onrender.com';

function Login({ setToken, setUser }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await axios.post(`${API_URL}/auth/login`, formData);
      setToken(response.data.token);
      setUser(response.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🔐 Login</h1>
        <p>Sign in to your KnowledgeScout account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              className="input-field"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="input-field"
              required
            />
          </div>

          {error && <div className="message error">{error}</div>}

          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary full-width"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <a href="/register">Register here</a></p>
        </div>

        <div className="demo-credentials">
          <h4>Demo Credentials:</h4>
          <p><strong>Username:</strong> demo</p>
          <p><strong>Password:</strong> demo123</p>
        </div>
      </div>
    </div>
  );
}

export default Login;