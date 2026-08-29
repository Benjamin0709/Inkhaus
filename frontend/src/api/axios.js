import axios from "axios";

const api = axios.create({
  baseURL: "/api",
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
