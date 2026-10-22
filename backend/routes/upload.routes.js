import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { uploadVideo } from "../middleware/upload.js"; 


const router = express.Router();

// Solo artista/admin pueden subir imágenes de portafolio
router.post("/upload", auth, authorizeRoles("artista", "admin"), upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No se recibió ninguna imagen" });
  res.status(201).json({ success: true, url: `/uploads/${req.file.filename}` });
});

router.post("/upload/video", auth, authorizeRoles("admin"), (req, res) => {
  uploadVideo.single("video")(req, res, (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "El video supera el máximo de 60 MB" : err.message;
      return res.status(400).json({ success: false, message: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No se recibió ningún video" });
    }
    res.status(201).json({ success: true, url: `/uploads/${req.file.filename}` });
  });
});

export default router;