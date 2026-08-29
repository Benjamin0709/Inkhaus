import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Portfolio from "../models/Portfolio.model.js";

const router = express.Router();

// Listar piezas (público) — con filtro por artista o estilo
router.get("/portfolio", async (req, res) => {
  try {
    const filter = {};
    if (req.query.artist) filter.artist = req.query.artist;
    if (req.query.style) filter.style = req.query.style;
    const items = await Portfolio.find(filter)
      .populate("artist", "nombre_artistico")
      .populate("style", "nombre")
      .sort({ createdAt: -1 });
    res.json({ success: true, info: items });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Crear pieza (artista o admin)
router.post("/portfolio", auth, authorizeRoles("artista", "admin"), async (req, res) => {
  try {
    const item = new Portfolio(req.body);
    await item.save();
    res.status(201).json({ success: true, info: item });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Eliminar pieza (artista o admin)
router.delete("/portfolio/:id", auth, authorizeRoles("artista", "admin"), async (req, res) => {
  try {
    await Portfolio.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Pieza eliminada" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
