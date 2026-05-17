import axios from "axios";
import type { InternalAxiosRequestConfig, AxiosResponse } from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api/v1";

// Map to store pending requests: key -> AbortController
const pendingMap = new Map<string, AbortController>();

/**
 * Generate a unique key for the request based on method, url, params and data
 */
function getRequestKey(config: InternalAxiosRequestConfig): string {
  const { method, url, params, data } = config;
  // Ensure we handle data correctly (Axios data can be string or object)
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  return [method, url, JSON.stringify(params), dataStr].join("&");
}

/**
 * Add request to pendingMap and cancel existing identical request
 */
function addPendingRequest(config: InternalAxiosRequestConfig) {
  const requestKey = getRequestKey(config);
  
  // Only auto-cancel GET requests by default to avoid side-effects on POST/PUT/DELETE
  // Unless explicitly requested via a custom header or config
  if (config.method?.toLowerCase() === 'get') {
    // If the request already has a signal (e.g. from component), we should respect it
    // but still manage it for duplicate cancellation
    if (pendingMap.has(requestKey)) {
      const controller = pendingMap.get(requestKey);
      controller?.abort();
      pendingMap.delete(requestKey);
    }
    
    // Create a new controller for this request
    const controller = new AbortController();
    
    // If there's an existing signal, we link them
    if (config.signal && typeof config.signal.addEventListener === 'function') {
      config.signal.addEventListener('abort', () => controller.abort());
    }
    
    config.signal = controller.signal;
    pendingMap.set(requestKey, controller);
  }
}

/**
 * Remove request from pendingMap when finished
 */
function removePendingRequest(config: InternalAxiosRequestConfig | AxiosResponse['config']) {
  const requestKey = getRequestKey(config as InternalAxiosRequestConfig);
  if (pendingMap.has(requestKey)) {
    pendingMap.delete(requestKey);
  }
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to inject JWT token and manage duplicate requests
apiClient.interceptors.request.use(
  (config) => {
    // 1. Manage duplicate requests
    addPendingRequest(config);

    // 2. Inject JWT token
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle global errors and cleanup pending requests
apiClient.interceptors.response.use(
  (response) => {
    // Cleanup pending request on success
    removePendingRequest(response.config);
    return response;
  },
  (error) => {
    // Cleanup pending request on error (including cancellation)
    if (error.config) {
      removePendingRequest(error.config);
    }

    // Handle cancellation error silently if needed, or re-throw
    if (axios.isCancel(error)) {
      console.debug("Request canceled:", error.message || "Duplicate request");
      // You might want to return a special rejected promise that components can ignore
      return new Promise(() => {}); // This "hangs" the promise so catch blocks don't trigger for cancels
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    } else if (error.response?.status === 403) {
      window.location.href = "/forbidden";
    }
    return Promise.reject(error);
  }
);
