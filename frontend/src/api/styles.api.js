import api from "./axios";

export const getStylesAPI   = ()      => api.get("/styles");
export const createStyleAPI = (data)  => api.post("/styles", data);