import fs from "fs";
import os from "os";
import path from "path";

/**
 * Almacenamiento de archivos subidos (imágenes de portafolio, fotos de perfil, video de Cuidados).
 *
 * STORAGE_DRIVER=local       (por defecto) guarda en disco y se sirve en /uploads.
 *                            En producción, apunta UPLOADS_DIR a un volumen persistente.
 * STORAGE_DRIVER=cloudinary  sube a Cloudinary y guarda la URL https en la base de datos.
 *
 * Las variables se leen en cada llamada (no al importar el módulo) para no depender
 * del orden en que se carga dotenv.
 */

const driver = () => (process.env.STORAGE_DRIVER || "local").toLowerCase();
export const isCloudinary = () => driver() === "cloudinary";

// ─── Disco local ───────────────────────────────────────────────────────
let resolvedUploadsDir;
export function uploadsDir() {
  if (!resolvedUploadsDir) {
    resolvedUploadsDir = process.env.UPLOADS_DIR
      ? path.resolve(process.env.UPLOADS_DIR)
      : path.join(process.cwd(), "uploads");
    fs.mkdirSync(resolvedUploadsDir, { recursive: true });
  }
  return resolvedUploadsDir;
}

// Con Cloudinary el archivo solo pasa por una carpeta temporal antes de subirse.
export const tempDir = () => (isCloudinary() ? os.tmpdir() : uploadsDir());

// ─── Cloudinary ────────────────────────────────────────────────────────
function cloudinaryCredentialsOk() {
  const e = process.env;
  return Boolean(e.CLOUDINARY_URL || (e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET));
}

function cloudName() {
  const e = process.env;
  if (e.CLOUDINARY_CLOUD_NAME) return e.CLOUDINARY_CLOUD_NAME;
  // CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
  return e.CLOUDINARY_URL?.match(/@([^/?#]+)/)?.[1] || "";
}

let cloudinaryPromise;
function getCloudinary() {
  if (!cloudinaryPromise) {
    // Import dinámico: en modo local no hace falta tener el paquete ni las credenciales.
    cloudinaryPromise = import("cloudinary")
      .then(({ v2 }) => {
        if (!cloudinaryCredentialsOk()) {
          throw new Error("Faltan las credenciales de Cloudinary (CLOUDINARY_URL o CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).");
        }
        if (process.env.CLOUDINARY_URL) {
          v2.config({ secure: true });
        } else {
          v2.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
          });
        }
        return v2;
      })
      .catch((error) => {
        cloudinaryPromise = undefined; // permite reintentar tras corregir la configuración
        throw error;
      });
  }
  return cloudinaryPromise;
}

const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);
const kindFromPath = (filePath) => (VIDEO_EXT.has(path.extname(filePath).toLowerCase()) ? "video" : "image");

// Entrega optimizada: Cloudinary elige formato y calidad según el navegador.
const optimizeImageUrl = (url) => url.replace("/image/upload/", "/image/upload/f_auto,q_auto/");

/** Sube un archivo del disco a Cloudinary y devuelve su URL https. No borra el archivo de origen. */
export async function uploadPathToCloudinary(filePath, kind = kindFromPath(filePath)) {
  const cld = await getCloudinary();
  const isVideo = kind === "video";
  const result = await cld.uploader.upload(filePath, {
    resource_type: isVideo ? "video" : "image",
    folder: isVideo ? "inkhaus/videos" : "inkhaus/imagenes",
    use_filename: false,
    unique_filename: true,
    overwrite: false,
    timeout: 120000,
  });
  return isVideo ? result.secure_url : optimizeImageUrl(result.secure_url);
}

// ─── API usada por las rutas ───────────────────────────────────────────

/**
 * Deja el archivo subido (ya validado por multer) en su destino definitivo.
 * Devuelve la URL que se guarda en la base de datos: "/uploads/<archivo>" o una URL de Cloudinary.
 */
export async function saveUploadedFile(file, kind = "image") {
  if (!isCloudinary()) return { url: `/uploads/${file.filename}` };
  try {
    return { url: await uploadPathToCloudinary(file.path, kind) };
  } finally {
    await fs.promises.unlink(file.path).catch(() => {});
  }
}

/** ¿La URL pertenece a nuestro almacenamiento? (disco local o nuestra cuenta de Cloudinary) */
export function isManagedAssetUrl(value) {
  if (typeof value !== "string" || !value) return false;
  if (value.startsWith("/uploads/")) return !value.includes("..");
  const cloud = cloudName();
  return Boolean(cloud) && value.startsWith(`https://res.cloudinary.com/${cloud}/`);
}

/** Extrae tipo y public_id de una URL de Cloudinary propia. Devuelve null si no es de nuestra cuenta. */
export function parseCloudinaryUrl(url) {
  const m = typeof url === "string" && url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/(.+)$/);
  if (!m || m[1] !== cloudName()) return null;
  const segments = m[3].split("/");
  const v = segments.findIndex((s) => /^v\d+$/.test(s)); // lo anterior a la versión son transformaciones
  if (v === -1 || v === segments.length - 1) return null;
  const publicId = decodeURIComponent(segments.slice(v + 1).join("/").replace(/\.[A-Za-z0-9]+$/, ""));
  return { resourceType: m[2], publicId };
}

/** Borra un archivo propio (disco o Cloudinary). Nunca lanza: devuelve true si se borró. */
export async function removeStoredFile(url) {
  if (typeof url !== "string" || !url) return false;
  try {
    if (url.startsWith("/uploads/")) {
      await fs.promises.unlink(path.join(uploadsDir(), path.basename(url)));
      return true;
    }
    const ref = parseCloudinaryUrl(url);
    if (!ref) return false;
    const cld = await getCloudinary();
    const result = await cld.uploader.destroy(ref.publicId, { resource_type: ref.resourceType, invalidate: true });
    return result?.result === "ok";
  } catch (error) {
    if (error.code !== "ENOENT") console.error("No se pudo borrar el archivo:", error.message);
    return false;
  }
}

/** Revisa la configuración al arrancar el servidor. */
export function validateStorageConfig() {
  if (driver() !== "local" && driver() !== "cloudinary") {
    console.error(`STORAGE_DRIVER no válido: "${process.env.STORAGE_DRIVER}" (usa "local" o "cloudinary").`);
    process.exit(1);
  }
  if (isCloudinary()) {
    if (!cloudinaryCredentialsOk()) {
      console.error("STORAGE_DRIVER=cloudinary requiere CLOUDINARY_URL (o CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET).");
      process.exit(1);
    }
    console.log("Almacenamiento de archivos: Cloudinary");
  } else {
    console.log(`Almacenamiento de archivos: disco local (${uploadsDir()})`);
    if (process.env.NODE_ENV === "production" && !process.env.UPLOADS_DIR) {
      console.warn("Aviso: en producción con almacenamiento local, los archivos se pierden en cada despliegue salvo que UPLOADS_DIR apunte a un volumen persistente. Considera STORAGE_DRIVER=cloudinary.");
    }
  }
}
