import api from "./axios";

export const registerAPI = (data) => api.post("/register", data);
export const loginAPI    = (data) => api.post("/login", data);
export const verifyAPI   = ()     => api.get("/verify");
