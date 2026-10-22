import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import { tempDir } from "../services/storage.js";

// La extensión del archivo guardado sale del tipo MIME validado, nunca del
// nombre original: así no se puede subir un .html (u otro) disfrazado de imagen.
const IMAGE_TYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const VIDEO_TYPES = { "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov" };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir()),
  filename: (req, file, cb) => {
    const ext = IMAGE_TYPES[file.mimetype] || VIDEO_TYPES[file.mimetype] || "";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  const ok = file.mimetype in IMAGE_TYPES;
  cb(ok ? null : new Error("Formato de imagen no soportado (usa JPG, PNG o WEBP)"), ok);
};

const videoFilter = (req, file, cb) => {
  const ok = file.mimetype in VIDEO_TYPES;
  cb(ok ? null : new Error("Formato de video no soportado (usa MP4 o WEBM)"), ok);
};

export const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

export const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60 MB
});

// ─── Verificación de contenido real (firma del archivo) ────────────────
// El mimetype lo declara el cliente y se puede falsear; la firma de los
// primeros bytes no. Si no coincide, se borra el archivo y se rechaza.
const ascii = (b, from, to) => b.toString("ascii", from, to);
const SIGNATURES = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  "video/mp4": (b) => ascii(b, 4, 8) === "ftyp",
  "video/quicktime": (b) => ["ftyp", "moov", "mdat", "wide", "free", "skip"].includes(ascii(b, 4, 8)),
  "video/webm": (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
};

export const verifyUploadedFile = async (req, res, next) => {
  if (!req.file) return next();

  let valid = false;
  let handle;
  try {
    handle = await fs.promises.open(req.file.path, "r");
    const buf = Buffer.alloc(12);
    await handle.read(buf, 0, 12, 0);
    valid = Boolean(SIGNATURES[req.file.mimetype]?.(buf));
  } catch {
    valid = false;
  } finally {
    await handle?.close().catch(() => {});
  }

  if (valid) return next();

  await fs.promises.unlink(req.file.path).catch(() => {});
  return res.status(400).json({
    success: false,
    message: "El archivo no corresponde al formato indicado",
  });
};

// Convierte los errores de multer (tamaño, formato) en respuestas 400 claras.
export const runUpload = (middleware, maxLabel) => (req, res, next) =>
  middleware(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? `El archivo supera el máximo de ${maxLabel}` : err.message;
    return res.status(400).json({ success: false, message });
  });
