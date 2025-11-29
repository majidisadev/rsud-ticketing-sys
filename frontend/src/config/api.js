import axios from 'axios';

// Auto-detect API URL based on current hostname
// If accessed via IP address, use the same IP for API
// If accessed via localhost, use localhost
const getApiUrl = () => {
  // Use environment variable if set
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Get current hostname (could be localhost or IP address)
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // If accessed via IP address, use the same IP for backend
  // If accessed via localhost, use localhost
  return `${protocol}//${hostname}:5000/api`;
};

// Helper to get base URL without /api suffix (for images, etc)
export const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace('/api', '');
  }
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${hostname}:5000`;
};

// Create axios instance with dynamic baseURL
const api = axios.create({
  // Don't set baseURL here - will be set dynamically in interceptor
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000,
  responseType: 'json'
  // Note: withCredentials not needed for Bearer token authentication
  // Only needed if using cookies for authentication
});

// Interceptor to dynamically set baseURL based on current hostname
api.interceptors.request.use((config) => {
  // Always get fresh API URL based on current window location
  const apiUrl = getApiUrl();
  
  // If URL is already absolute, don't modify
  if (config.url && config.url.startsWith('http')) {
    config.baseURL = '';
  } else {
    // For relative URLs, set baseURL to use current hostname
    // This ensures it uses IP address if accessed via IP, or localhost if accessed via localhost
    config.baseURL = apiUrl;
  }
  
  // Calculate full URL for logging
  const fullURL = config.url?.startsWith('http') 
    ? config.url 
    : (config.baseURL + (config.url || ''));
  
  // Always log to help debug
  console.log('🔵 API Request:', {
    method: config.method?.toUpperCase(),
    originalUrl: config.url,
    baseURL: config.baseURL,
    fullURL: fullURL,
    hostname: window.location.hostname,
    origin: window.location.origin
  });
  
  // Add token to requests
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error details for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Handle network errors (CORS, connection refused, blocked by client, etc.)
    if (!error.response) {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        // Check if it's a blocked request (ERR_BLOCKED_BY_CLIENT)
        if (error.message.includes('ERR_BLOCKED_BY_CLIENT') || 
            error.code === 'ERR_BLOCKED_BY_CLIENT') {
          error.message = 'Request diblokir oleh browser atau ekstensi. Silakan nonaktifkan ad blocker atau ekstensi yang memblokir request.';
        } else {
          error.message = `Tidak dapat terhubung ke server. Pastikan backend berjalan di ${protocol}//${hostname}:5000`;
        }
      }
      
      // Handle CORS errors
      if (error.message.includes('CORS') || error.message.includes('cors')) {
        error.message = `Error CORS: Pastikan backend mengizinkan origin ${window.location.origin}`;
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper untuk download blob
api.downloadBlob = async (url, filename) => {
  const token = localStorage.getItem('token');
  const baseURL = getApiUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
  
  const response = await fetch(fullUrl, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Download failed');
  }
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(a);
};

export default api;

