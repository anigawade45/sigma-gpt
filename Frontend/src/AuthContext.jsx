import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"; // adjust if needed

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// token handling
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = AuthStorage.getAccessToken();
    if (token) {
      config.headers["Authorization"] = "Bearer " + token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      const refreshToken = AuthStorage.getRefreshToken();
      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const resp = await axios.post(
          API_BASE + "/api/auth/refresh-token",
          { refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        const { accessToken: newAccess, refreshToken: newRefresh } = resp.data;
        AuthStorage.setTokens(newAccess, newRefresh);
        api.defaults.headers.common["Authorization"] = "Bearer " + newAccess;
        processQueue(null, newAccess);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        AuthStorage.clear();
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Simple storage helper: access token in memory + localStorage for refresh (optionally access too)
const AuthStorage = {
  accessToken: null,
  getAccessToken() {
    if (this.accessToken) return this.accessToken;
    const token = sessionStorage.getItem("accessToken");
    if (token) {
      this.accessToken = token;
      return token;
    }
    return null;
  },
  setAccessToken(token) {
    this.accessToken = token;
    if (token) sessionStorage.setItem("accessToken", token);
    else sessionStorage.removeItem("accessToken");
  },
  getRefreshToken() {
    return localStorage.getItem("refreshToken");
  },
  setRefreshToken(token) {
    if (token) localStorage.setItem("refreshToken", token);
    else localStorage.removeItem("refreshToken");
  },
  setTokens(access, refresh) {
    this.setAccessToken(access);
    this.setRefreshToken(refresh);
  },
  clear() {
    this.accessToken = null;
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(AuthStorage.getAccessToken());

  useEffect(() => {
    // on mount, if we have tokens attempt to fetch profile
    const tryLoadProfile = async () => {
      const token = AuthStorage.getAccessToken();
      if (!token) return;
      try {
        const res = await api.get("/api/user/profile");
        setUser(res.data.user);
        setAccessToken(token);
      } catch (err) {
        AuthStorage.clear();
        setUser(null);
        setAccessToken(null);
      }
    };
    tryLoadProfile();
  }, []);

  const login = async (email, password) => {
    const resp = await api.post("/api/auth/login", { email, password });
    const { accessToken: at, refreshToken: rt, user: u } = resp.data;
    AuthStorage.setTokens(at, rt);
    setAccessToken(at);
    setUser(u);
    return { accessToken: at, refreshToken: rt, user: u };
  };

  const register = async (name, email, password) => {
    const resp = await api.post("/api/auth/register", {
      name,
      email,
      password,
    });
    return resp.data;
  };

  const logout = async () => {
    try {
      const refreshToken = AuthStorage.getRefreshToken();
      if (refreshToken) {
        await api.post("/api/auth/logout", { refreshToken });
      }
    } catch (err) {
      // ignore errors on logout
    } finally {
      AuthStorage.clear();
      setUser(null);
      setAccessToken(null);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, login, register, logout, api }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;
