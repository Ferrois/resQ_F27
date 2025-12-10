import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const ApiContext = createContext();

// Base URL for the API - adjust this to match your server URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const ApiProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    // Get token from localStorage if it exists
    return localStorage.getItem('accessToken') || null;
  });

  // Create axios instance with default config
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor to include token for authenticated requests
  api.interceptors.request.use(
    (config) => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        config.headers.Authorization = `Bearer ${storedToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor to handle errors
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        setToken(null);
        localStorage.removeItem('accessToken');
      }
      return Promise.reject(error);
    }
  );

  // Set token and save to localStorage
  const setAuthToken = useCallback((newToken) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('accessToken', newToken);
    } else {
      localStorage.removeItem('accessToken');
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem('accessToken');
  }, []);

  // Unauthenticated request (public endpoints)
  const publicRequest = useCallback(async (method, endpoint, data = null) => {
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
  }, [api]);

  // Authenticated request (protected endpoints)
  const authRequest = useCallback(async (method, endpoint, data = null) => {
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
  }, [api]);

  const value = {
    api,
    token,
    setAuthToken,
    logout,
    publicRequest,
    authRequest,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

