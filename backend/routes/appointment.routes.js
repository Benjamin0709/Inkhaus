import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Appointment from "../models/Appointment.model.js";

const router = express.Router();

// Crear cita (cliente autenticado)
router.post("/appointments", auth, async (req, res) => {
  try {
    const apt = new Appointment({ ...req.body, cliente: req.auth.id });
    await apt.save();
    res.status(201).json({ success: true, info: apt });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Mis citas (cliente)
router.get("/appointments/me", auth, async (req, res) => {
  try {
    const apts = await Appointment.find({ cliente: req.auth.id })
      .populate("artista", "nombre_artistico")
      .populate("style", "nombre")
      .sort({ fecha_hora: 1 });
    res.json({ success: true, info: apts });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Todas las citas (admin)
router.get("/appointments", auth, authorizeRoles("admin", "artista"), async (req, res) => {
  try {
    const apts = await Appointment.find()
      .populate("cliente", "name email phone")
      .populate("artista", "nombre_artistico")
      .populate("style", "nombre")
      .sort({ fecha_hora: 1 });
    res.json({ success: true, info: apts });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Actualizar estado (admin/artista)
router.put("/appointments/:id", auth, authorizeRoles("admin", "artista"), async (req, res) => {
  try {
    const apt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, info: apt });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Cancelar cita (cliente o admin)
router.delete("/appointments/:id", auth, async (req, res) => {
  try {
    await Appointment.findByIdAndUpdate(req.params.id, { estado: "cancelada" });
    res.json({ success: true, message: "Cita cancelada" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
