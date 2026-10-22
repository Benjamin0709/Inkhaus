import express from "express";
import fs from "fs";
import path from "path";
import { auth, authorizeRoles } from "../middleware/auth.js";
import SiteContent from "../models/SiteContent.model.js";

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
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/site-content/:key", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(404).json({ success: false, message: "Clave no válida" });
    }
    const value = String(req.body.value || "");
    if (value && !value.startsWith("/uploads/")) {
      return res.status(400).json({ success: false, message: "Valor no válido" });
    }

    // Si se reemplaza o quita el video, borramos el archivo anterior del disco
    const previous = await SiteContent.findOne({ key });
    if (previous?.value?.startsWith("/uploads/") && previous.value !== value) {
      const file = path.join(process.cwd(), "uploads", path.basename(previous.value));
      fs.unlink(file, () => {});
    }

    const item = await SiteContent.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
    res.json({ success: true, info: { key, value: item.value } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;