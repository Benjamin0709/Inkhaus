import api from "./axios";

export const getArtistPricingAPI = (artistId) => api.get(`/pricing/artist/${artistId}`);
export const saveArtistPricingAPI = (artistId, tabla_precios) =>
  api.put(`/pricing/artist/${artistId}`, { tabla_precios });
export const getQuoteAPI = (zona_corporal, tamanio, artist) =>
  api.get("/pricing/quote", { params: { zona_corporal, tamanio, artist } });
