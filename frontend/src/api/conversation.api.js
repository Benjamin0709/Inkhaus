import api from "./axios";

export const createConversationAPI = (payload) => api.post("/conversations", payload);
export const getMyConversationsAPI = () => api.get("/conversations/me");
export const getAllConversationsAdminAPI = () => api.get("/conversations/all");
export const getConversationMessagesAPI = (id) => api.get(`/conversations/${id}/messages`);
export const sendConversationMessageAPI = (id, texto) => api.post(`/conversations/${id}/messages`, { texto });
export const closeConversationAPI = (id) => api.put(`/conversations/${id}/close`);