import api from "./axios";

export const getAvailabilityAPI = (artista, date) => api.get("/appointments/availability", { params: { artista, date } });
export const createAppointmentAPI = (payload) => api.post("/appointments", payload);
export const getMyAppointmentsAPI = () => api.get("/appointments/me");
export const cancelAppointmentAPI = (id) => api.put(`/appointments/${id}/cancel`);