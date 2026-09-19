import api from "./axios";

export const getArtistsAPI      = ()             => api.get("/artists");
export const getArtistAPI       = (id)           => api.get(`/artists/${id}`);
export const createArtistFullAPI = (data)        => api.post("/artists/full", data);
export const deleteArtistAPI    = (id)           => api.delete(`/artists/${id}`);
export const getMyArtistProfileAPI = ()          => api.get("/artists/me");
export const getAllArtistsAdminAPI = ()          => api.get("/artists/all");
export const updateArtistFullAPI = (id, payload) => api.put(`/artists/${id}/full`, payload);
export const updateArtistAPI    = (id, payload)  => api.put(`/artists/${id}`, payload);
export const reactivateArtistAPI = (id)          => api.put(`/artists/${id}/reactivate`);
export const deleteArtistPermanentAPI = (id)     => api.delete(`/artists/${id}/permanent`);