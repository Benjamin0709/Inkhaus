import api from "./axios";

export const getPortfolioAPI = (params) => api.get("/portfolio", { params });
export const createPortfolioAPI = (payload) => api.post("/portfolio", payload);
export const updatePortfolioAPI = (id, payload) => api.put(`/portfolio/${id}`, payload);
export const deletePortfolioAPI = (id) => api.delete(`/portfolio/${id}`);