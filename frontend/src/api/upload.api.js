import api from "./axios";

export const uploadImageAPI = (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const uploadVideoAPI = (formData) => {
  return api.post("/videos/upload", formData);
};