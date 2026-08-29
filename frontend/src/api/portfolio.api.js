import api from "./axios";

export const getPortfolioAPI = (params) => api.get("/portfolio", { params });
