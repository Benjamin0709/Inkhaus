import api from "./axios";

export const registerAPI = (data) => api.post("/register", data);
export const loginAPI    = (data) => api.post("/login", data);
export const verifyAPI   = ()     => api.get("/verify");
export const updateMeAPI = (payload) => api.put("/me", payload);
export const forgotPasswordAPI = (email) => api.post("/forgot-password", { email });
export const resetPasswordAPI = (token, password) => api.post(`/reset-password/${token}`, { password });
export const changePasswordAPI = (currentPassword, newPassword) => api.put("/change-password", { currentPassword, newPassword });