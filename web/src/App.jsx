import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Login from './components/Login';
import Register from './components/Register';
import Survey from './components/Survey';
import Home from './components/Home';
import TribeDashboard from './components/TribeDashboard';
import Lessons from './components/Lessons';
import Profile from './components/Profile';
import Download from './components/Download';

const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { user } = useStore();
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  const { setUser } = useStore();

  useEffect(() => {
    const loadUser = async () => {
      const userJson = localStorage.getItem('user');
      if (userJson) setUser(JSON.parse(userJson));
    };
    loadUser();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/survey" element={<ProtectedRoute><Survey /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/tribe" element={<ProtectedRoute><TribeDashboard /></ProtectedRoute>} />
        <Route path="/lessons" element={<ProtectedRoute><Lessons /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/download" element={<ProtectedRoute><Download /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}