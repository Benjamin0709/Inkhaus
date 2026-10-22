import axios from "axios";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
});

// Adjuntar token en cada request automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("inkhaus_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manejar 401 global: limpiar sesión
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("inkhaus_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
