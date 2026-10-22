import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Pricing from "../models/Pricing.model.js";
import Artist from "../models/Artist.model.js";

const router = express.Router();

// Motor de cotización (público)
router.get("/pricing/quote", async (req, res) => {
  try {
    const { zona_corporal, tamanio, style } = req.query;
    const filter = { zona_corporal, tamanio };
    if (style) filter.style = style;
    if (req.query.artist) filter.artist = req.query.artist;
    const price = await Pricing.findOne(filter).populate("style", "nombre");
    if (!price) return res.status(404).json({ success: false, message: "Sin tarifa para esta combinación" });
    res.json({ success: true, info: price });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Rutas de artista ──────
router.get("/pricing/artist/:artistId", async (req, res) => {
  try {
    const prices = await Pricing.find({ artist: req.params.artistId });
    res.json({ success: true, info: prices });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/pricing/artist/:artistId", auth, async (req, res) => {
  try {
    const { tabla_precios = [] } = req.body;
    const docs = tabla_precios.map((p) => ({
      artist:         req.params.artistId,
      zona_corporal:  p.zona,
      tamanio:        p.tamanio,
      precio_min_clp: p.precio_min,
      precio_max_clp: p.precio_max,
    }));
    await Pricing.deleteMany({ artist: req.params.artistId });
    const saved = await Pricing.insertMany(docs);
    res.json({ success: true, info: saved });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Rutas admin ────────────────
router.get("/pricing", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const prices = await Pricing.find()
      .populate("style", "nombre")
      .populate("artist", "nombre_artistico");
    res.json({ success: true, info: prices });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/pricing", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const item = new Pricing(req.body);
    await item.save();
    res.status(201).json({ success: true, info: item });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/pricing/:id", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const item = await Pricing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, info: item });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/pricing/:id", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    await Pricing.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Tarifa eliminada" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;