import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Pricing from "../models/Pricing.model.js";

const router = express.Router();

// Motor de cotización (público): f(zona, tamaño, estilo)
router.get("/pricing/quote", async (req, res) => {
  try {
    const { zona_corporal, tamanio, style } = req.query;
    const filter = { zona_corporal, tamanio };
    if (style) filter.style = style;
    const price = await Pricing.findOne(filter).populate("style", "nombre");
    if (!price) return res.status(404).json({ success: false, message: "Sin tarifa para esta combinación" });
    res.json({ success: true, info: price });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Listar toda la tabla (admin)
router.get("/pricing", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const prices = await Pricing.find().populate("style", "nombre");
    res.json({ success: true, info: prices });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Crear tarifa (admin)
router.post("/pricing", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const item = new Pricing(req.body);
    await item.save();
    res.status(201).json({ success: true, info: item });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Editar tarifa (admin)
router.put("/pricing/:id", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const item = await Pricing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, info: item });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Eliminar tarifa (admin)
router.delete("/pricing/:id", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    await Pricing.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Tarifa eliminada" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
