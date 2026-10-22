import api from "./axios";

export const getSiteContentAPI = (key) => api.get(`/site-content/${key}`);
export const setSiteContentAPI = (key, value) => api.put(`/site-content/${key}`, { value });