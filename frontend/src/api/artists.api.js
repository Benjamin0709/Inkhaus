import api from "./axios";

export const getArtistsAPI = ()     => api.get("/artists");
export const getArtistAPI  = (id)   => api.get(`/artists/${id}`);
