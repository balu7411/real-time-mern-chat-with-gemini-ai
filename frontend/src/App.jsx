import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProjectWorkspace from "./pages/ProjectWorkspace.jsx";
import Profile from "./pages/Profile.jsx";
import GoogleCallback from "./pages/GoogleCallback.jsx";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <CenteredMessage text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function CenteredMessage({ text }) {
  return (
    <div className="h-screen flex items-center justify-center text-gray-400">
      {text}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />

      {/*
       * Dashboard is the messenger shell.
       * Chat routes intentionally render Dashboard instead of opening
       * PrivateChat/GroupChat as full-screen standalone pages.
       */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/private-chat/:id"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/group-chat/:id"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Keep the older private-chat URL working too. */}
      <Route
        path="/chat/:id"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/project/:id"
        element={
          <ProtectedRoute>
            <ProjectWorkspace />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
