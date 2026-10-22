import api from "./axios";

export const createPaymentAPI = (appointmentId) => api.post("/payments/create", { appointmentId });
export const getPaymentByOrderAPI = (buyOrder) => api.get(`/payments/order/${buyOrder}`);