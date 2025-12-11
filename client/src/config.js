const isProduction = import.meta.env.PROD || import.meta.env.VITE_NODE_ENV === 'production';

export const config = {
  isProduction,
  API_URL: isProduction 
    ? 'https://resq-f27.onrender.com' 
    : (import.meta.env.VITE_API_URL || 'http://localhost:8080'),
  SOCKET_URL: isProduction 
    ? 'https://resq-f27.onrender.com' 
    : (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080'),
};

