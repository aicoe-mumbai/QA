import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboards';
import AdminDashboard from './components/Admin';
import NotFound from './components/NotFound';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('authToken');
    setIsAuthenticated(token !== null);
  }, []);
 
  return (
    <Router>
      <Routes>
      <Route path="/admin" element={<AdminDashboard />} />

        {/* Redirect root path to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login page */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={() => setIsAuthenticated(true)} />
          }
        />

        {/* Dashboard page */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Dashboard onLogout={() => setIsAuthenticated(false)} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Catch-all route for unknown pages */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
