import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import axios from "axios";
import useLocalStorage from "../hooks/useLocalStorage";
import { config } from "../config";

const ApiContext = createContext();

// Base URL for the API - uses config.js for environment detection
const API_BASE_URL = config.API_URL;

export const ApiProvider = ({ children }) => {
  const [auth, setAuth] = useLocalStorage("resQ-auth", {
    accessToken: null,
    refreshToken: null,
    user: null,
  });
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Create axios instance with default config
  const api = useMemo(
    () =>
      axios.create({
        baseURL: API_BASE_URL,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    []
  );

  const logout = useCallback(() => {
    setAuth({
      accessToken: null,
      refreshToken: null,
      user: null,
    });
  }, [setAuth]);

  const setSession = useCallback(
    (session) => {
      setAuth((prev) => ({
        ...prev,
        accessToken: session?.accessToken ?? null,
        refreshToken: session?.refreshToken ?? null,
        user: session?.user ?? prev.user,
      }));
    },
    [setAuth]
  );

  const refreshAccessToken = useCallback(async () => {
    if (!auth.refreshToken) return null;
    try {
      const response = await axios.post(`${API_BASE_URL}/user/refresh`, {
        refreshToken: auth.refreshToken,
      });
      const { accessToken, refreshToken, user } = response.data;
      setAuth({
        accessToken,
        refreshToken,
        user: user || auth.user,
      });
      return accessToken;
    } catch (error) {
      logout();
      return null;
    }
  }, [auth.refreshToken, auth.user, logout, setAuth]);

  // Add request/response interceptors
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (auth.accessToken) {
          config.headers.Authorization = `Bearer ${auth.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const newAccessToken = await refreshAccessToken();
          if (newAccessToken) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [api, auth.accessToken, refreshAccessToken]);

  const login = useCallback(
    async (username, password) => {
      try {
        const response = await api.post("/user/login", { username, password });
        const { accessToken, refreshToken, user } = response.data;
        setAuth({ accessToken, refreshToken, user });
        return { success: true, data: response.data };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data || { message: error.message },
        };
      }
    },
    [api, setAuth]
  );

  // Attempt to restore session on app load
  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (auth.accessToken) {
          const response = await api.get("/user/me");
          setAuth((prev) => ({ ...prev, user: response.data.user }));
        } else if (auth.refreshToken) {
          await refreshAccessToken();
        }
      } catch (error) {
        await refreshAccessToken();
      } finally {
        setIsLoadingSession(false);
      }
    };

    bootstrap();
  }, []);

  // Unauthenticated request (public endpoints)
  const publicRequest = useCallback(
    async (method, endpoint, data = null) => {
      try {
        const response = await api.request({
          method,
          url: endpoint,
          data,
        });
        return { success: true, data: response.data };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data || { message: error.message },
        };
      }
    },
    [api]
  );

  // Authenticated request (protected endpoints)
  const authRequest = useCallback(
    async (method, endpoint, data = null) => {
      try {
        const response = await api.request({
          method,
          url: endpoint,
          data,
        });
        return { success: true, data: response.data };
      } catch (error) {
        return {
          success: false,
          error: error.response?.data || { message: error.message },
        };
      }
    },
    [api]
  );

  const value = {
    api,
    auth,
    isLoadingSession,
    login,
    logout,
    publicRequest,
    authRequest,
    setSession,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context;
};

