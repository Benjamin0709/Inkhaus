import api from "./axios";

export const sendContactMessageAPI = (payload) => api.post("/contact", payload);
export const getContactMessagesAPI = () => api.get("/contact"); // admin
export const updateContactMessageAPI = (id, atendido) => api.put(`/contact/${id}`, { atendido }); // admin