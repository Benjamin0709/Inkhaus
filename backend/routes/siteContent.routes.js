import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import SiteContent from "../models/SiteContent.model.js";
import { isManagedAssetUrl, removeStoredFile } from "../services/storage.js";

const router = express.Router();
const ALLOWED_KEYS = ["cuidados_video_url"];

router.get("/site-content/:key", async (req, res) => {
  try {
    if (!ALLOWED_KEYS.includes(req.params.key)) {
      return res.status(404).json({ success: false, message: "Clave no válida" });
    }
    const item = await SiteContent.findOne({ key: req.params.key });
    res.json({ success: true, info: { key: req.params.key, value: item?.value || "" } });
  } catch (e) {
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

router.put("/site-content/:key", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(404).json({ success: false, message: "Clave no válida" });
    }
    const value = typeof req.body.value === "string" ? req.body.value : "";
    // Solo se aceptan archivos de nuestro propio almacenamiento (disco o Cloudinary).
    if (value && !isManagedAssetUrl(value)) {
      return res.status(400).json({ success: false, message: "Valor no válido" });
    }

    const previous = await SiteContent.findOne({ key });
    const item = await SiteContent.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });

    // Si se reemplazó o quitó el video, se borra el archivo anterior (sin bloquear la respuesta).
    if (previous?.value && previous.value !== value) {
      removeStoredFile(previous.value);
    }
    res.json({ success: true, info: { key, value: item.value } });
  } catch (e) {
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

export default router;
