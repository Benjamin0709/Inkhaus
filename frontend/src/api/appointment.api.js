import api from "./axios";

export const getAvailabilityAPI = (artistId, date) =>
  api.get(`/appointments/availability/${artistId}`, { params: { date } });
export const createAppointmentAPI = (payload) => api.post("/appointments", payload);
export const getMyAppointmentsAPI = () => api.get("/appointments/me");
export const getAllAppointmentsAPI = () => api.get("/appointments"); // admin / artista
export const cancelAppointmentAPI = (id) => api.put(`/appointments/${id}`, { estado: "cancelada" });
export const updateAppointmentAPI = (id, payload) => api.put(`/appointments/${id}`, payload); // reagendar/confirmar (artista/admin)