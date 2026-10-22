import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import {
  upload,
  uploadVideo,
  runUpload,
  verifyUploadedFile,
} from "../middleware/upload.js";
import { saveUploadedFile } from "../services/storage.js";

const router = express.Router();

// Deja el archivo validado en el almacenamiento configurado (disco o Cloudinary).
const respondWithStoredFile = (kind, missingMessage) => async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: missingMessage });
  }
  try {
    const { url } = await saveUploadedFile(req.file, kind);
    res.status(201).json({ success: true, url });
  } catch (error) {
    console.error("upload:", error.message);
    res.status(502).json({
      success: false,
      message: "No se pudo guardar el archivo. Intenta de nuevo en unos minutos.",
    });
  }
};

// Solo artista/admin pueden subir imágenes de portafolio
router.post(
  "/upload",
  auth,
  authorizeRoles("artista", "admin"),
  runUpload(upload.single("image"), "8 MB"),
  verifyUploadedFile,
  respondWithStoredFile("image", "No se recibió ninguna imagen")
);

router.post(
  "/upload/video",
  auth,
  authorizeRoles("admin"),
  runUpload(uploadVideo.single("video"), "60 MB"),
  verifyUploadedFile,
  respondWithStoredFile("video", "No se recibió ningún video")
);

export default router;
