import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../config/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser && savedUser !== "undefined") {
      let parsed = null;
      try {
        parsed = JSON.parse(savedUser);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setLoading(false);
        return;
      }
      if (parsed && typeof parsed === "object") setUser(parsed);
      // Verify token
      api
        .get("/auth/me")
        .then((res) => {
          if (res?.data?.user) {
            setUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(res.data.user));
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const res = await api.post("/auth/login", { username, password });
      const data = res?.data;
      if (!data?.token || !data?.user) {
        throw new Error(
          "Respons server tidak valid. Pastikan backend berjalan dan mengembalikan token serta data user."
        );
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return data;
    } catch (error) {
      // Handle different types of errors
      if (error.code === "ECONNREFUSED" || error.message === "Network Error") {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        throw new Error(
          `Tidak dapat terhubung ke server. Pastikan backend berjalan di ${protocol}//${hostname}:5000`,
        );
      }

      // Handle blocked by client (ad blocker, etc.)
      if (error.message && error.message.includes("diblokir")) {
        throw new Error(error.message);
      }

      // Handle CORS errors
      if (error.message && error.message.includes("CORS")) {
        throw new Error(error.message);
      }

      // Re-throw other errors
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.setItem("user", null);
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
