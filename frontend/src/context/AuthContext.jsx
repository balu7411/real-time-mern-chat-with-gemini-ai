import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

function getToken() {
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("jwt") ||
    localStorage.getItem("jwt")
  );
}

function clearTokens() {
  ["token", "accessToken", "jwt"].forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });

    clearTokens();
    sessionStorage.setItem("token", res.data.token);
    setUser(res.data.user);

    return res.data;
  }

  async function register(name, email, password, username = "") {
    const body = { name, email, password };
    if (username?.trim()) body.username = username.trim();

    const res = await api.post("/auth/register", body);

    clearTokens();
    sessionStorage.setItem("token", res.data.token);
    setUser(res.data.user);

    return res.data;
  }

  function updateUser(nextUser) {
    setUser(nextUser);
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
