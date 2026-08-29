import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Artist from "../models/Artist.model.js";

const router = express.Router();

// Listar artistas activos (público)
router.get("/artists", async (req, res) => {
  try {
    const artists = await Artist.find({ activo: true }).populate("user", "name email foto_url");
    res.json({ success: true, info: artists });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Detalle artista (público)
router.get("/artists/:id", async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id).populate("user", "name email foto_url");
    if (!artist) return res.status(404).json({ success: false, message: "Artista no encontrado" });
    res.json({ success: true, info: artist });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Crear artista (solo admin)
router.post("/artists", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const artist = new Artist(req.body);
    await artist.save();
    res.status(201).json({ success: true, info: artist });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Editar artista (admin o el propio artista)
router.put("/artists/:id", auth, authorizeRoles("admin", "artista"), async (req, res) => {
  try {
    const artist = await Artist.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, info: artist });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
