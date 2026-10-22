import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Pricing from "../models/Pricing.model.js";
import Artist from "../models/Artist.model.js";
import mongoose from "mongoose";
import { resolveQuote } from "../services/quote.js";

const TAMANIOS = ["pequeño", "mediano", "grande", "manga", "espalda_completa", "custom"];
const asText = (v) => (typeof v === "string" && v ? v : undefined);

const router = express.Router();

// Motor de cotización (público)
router.get("/pricing/quote", async (req, res) => {
  try {
    const zona = asText(req.query.zona_corporal);
    const tamanio = asText(req.query.tamanio);
    if (!zona || !tamanio) {
      return res.status(400).json({ success: false, message: "Faltan zona_corporal y tamanio" });
    }
    const quote = await resolveQuote({ artistId: asText(req.query.artist), zona, tamanio });
    if (!quote) {
      return res.status(404).json({ success: false, message: "Sin tarifa para esta combinación" });
    }
    res.json({
      success: true,
      info: { precio_min_clp: quote.min, precio_max_clp: quote.max, fuente: quote.fuente },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Error interno del servidor" });
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

// Reemplaza la tabla de precios de un artista.
// Solo el propio artista o un admin; y se valida todo ANTES de borrar nada.
router.put("/pricing/artist/:artistId", auth, authorizeRoles("artista", "admin"), async (req, res) => {
  try {
    const { artistId } = req.params;
    if (!mongoose.isValidObjectId(artistId)) {
      return res.status(400).json({ success: false, message: "Artista no válido" });
    }

    const artist = await Artist.findById(artistId).select("user");
    if (!artist) return res.status(404).json({ success: false, message: "Artista no encontrado" });

    const isAdmin = (req.auth?.roles || []).includes("admin");
    if (!isAdmin && artist.user.toString() !== req.auth.id) {
      return res.status(403).json({ success: false, message: "No puedes editar los precios de otro artista" });
    }

    const { tabla_precios } = req.body;
    if (!Array.isArray(tabla_precios) || tabla_precios.length > 200) {
      return res.status(400).json({ success: false, message: "La tabla de precios no es válida" });
    }

    const docs = [];
    for (const p of tabla_precios) {
      const min = Number(p?.precio_min);
      const max = Number(p?.precio_max);
      const valida =
        typeof p?.zona === "string" && p.zona.trim() &&
        TAMANIOS.includes(p?.tamanio) &&
        Number.isFinite(min) && Number.isFinite(max) &&
        min >= 0 && max >= min;
      if (!valida) {
        return res.status(400).json({ success: false, message: "Hay una fila de la tabla con datos no válidos" });
      }
      docs.push({
        artist: artist._id,
        zona_corporal: p.zona.trim(),
        tamanio: p.tamanio,
        precio_min_clp: min,
        precio_max_clp: max,
      });
    }

    await Pricing.deleteMany({ artist: artist._id });
    const saved = await Pricing.insertMany(docs);
    res.json({ success: true, info: saved });
  } catch (e) {
    res.status(500).json({ success: false, message: "Error interno del servidor" });
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