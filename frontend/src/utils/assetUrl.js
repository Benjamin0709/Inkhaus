const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/**
 * Convierte la URL guardada en la base de datos en una URL que el navegador pueda cargar.
 * - "/uploads/x.png" (almacenamiento local) vive en el BACKEND, no en el dominio del frontend:
 *   se le antepone VITE_API_URL. En desarrollo (sin VITE_API_URL) queda igual y lo resuelve el proxy de Vite.
 * - Las URLs absolutas (Cloudinary, etc.) se dejan tal cual.
 */
export function assetUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

/**
 * Cloudinary: el backend agrega "f_auto,q_auto" al subir. Si la cuenta tiene
 * "Strict transformations" activado, esa URL devuelve error; la original sí funciona.
 */
export function withoutCloudinaryTransform(url) {
  return typeof url === "string" ? url.replace("/image/upload/f_auto,q_auto/", "/image/upload/") : url;
}
