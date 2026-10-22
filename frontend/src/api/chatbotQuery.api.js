import api from "./axios";

export const logUnansweredQueryAPI = (payload) => api.post("/chatbot-queries", payload);
export const getUnansweredQueriesAPI = () => api.get("/chatbot-queries");
export const updateUnansweredQueryAPI = (id, payload) => api.put(`/chatbot-queries/${id}`, payload);