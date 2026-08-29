import api from "./axios";

export const getQuoteAPI = (zona_corporal, tamanio, style) =>
  api.get("/pricing/quote", { params: { zona_corporal, tamanio, style } });
