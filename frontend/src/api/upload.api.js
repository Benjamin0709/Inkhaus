import api from "./axios";

// Las subidas pueden tardar más que el timeout general (10 s) de la API.
const UPLOAD_TIMEOUT_MS = 120000;

export const uploadImageAPI = (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
  });
};

export const uploadVideoAPI = (file) => {
  const formData = new FormData();
  formData.append("video", file);
  return api.post("/upload/video", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: UPLOAD_TIMEOUT_MS,
  });
};
