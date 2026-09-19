import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Solo artista/admin pueden subir imágenes de portafolio
router.post("/upload", auth, authorizeRoles("artista", "admin"), upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No se recibió ninguna imagen" });
  res.status(201).json({ success: true, url: `/uploads/${req.file.filename}` });
});

export default router;