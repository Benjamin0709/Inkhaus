import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Appointment from "../models/Appointment.model.js";
import Artist from "../models/Artist.model.js";

const router = express.Router();

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const SLOT_MINUTES = 60;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ── Horarios disponibles de un artista para una fecha dada ──
router.get("/appointments/availability", async (req, res) => {
  try {
    const { artista, date } = req.query;
    if (!artista || !date) {
      return res.status(400).json({ success: false, message: "Faltan artista y date" });
    }
    const artist = await Artist.findById(artista);
    if (!artist) return res.status(404).json({ success: false, message: "Artista no encontrado" });

    const dia = DIAS_SEMANA[new Date(date + "T00:00:00").getDay()];
    const bloques = (artist.horarios || []).filter((h) => h.dia === dia);
    if (bloques.length === 0) {
      return res.json({ success: true, info: [] });
    }

    const ocupadas = await Appointment.find({ artista, date, estado: { $ne: "cancelada" } }).select("time");
    const ocupadasSet = new Set(ocupadas.map((a) => a.time));

    const slots = [];
    for (const b of bloques) {
      let cursor = toMinutes(b.desde);
      const fin = toMinutes(b.hasta);
      while (cursor + SLOT_MINUTES <= fin) {
        const hhmm = toHHMM(cursor);
        if (!ocupadasSet.has(hhmm)) slots.push(hhmm);
        cursor += SLOT_MINUTES;
      }
    }

    res.json({ success: true, info: slots });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Crear cita ──
router.post("/appointments", auth, async (req, res) => {
  try {
    const { artista, quote, tipo, date, time, notas } = req.body;
    if (!artista || !tipo || !date || !time) {
      return res.status(400).json({ success: false, message: "Artista, tipo, fecha y hora son obligatorios" });
    }
    if (!["ajuste", "sesion"].includes(tipo)) {
      return res.status(400).json({ success: false, message: "Tipo de cita inválido" });
    }

    const artistDoc = await Artist.findById(artista);
    if (!artistDoc) return res.status(404).json({ success: false, message: "Artista no encontrado" });

    const dia = DIAS_SEMANA[new Date(date + "T00:00:00").getDay()];
    const disponible = (artistDoc.horarios || []).some(
      (h) => h.dia === dia && toMinutes(time) >= toMinutes(h.desde) && toMinutes(time) + SLOT_MINUTES <= toMinutes(h.hasta)
    );
    if (!disponible) {
      return res.status(400).json({ success: false, message: "El artista no atiende en ese día/horario" });
    }

    const existente = await Appointment.findOne({ artista, date, time, estado: { $ne: "cancelada" } });
    if (existente) {
      return res.status(400).json({ success: false, message: "Ese horario ya fue reservado" });
    }

    const appointment = new Appointment({
      user: req.auth.id,
      artista,
      quote: quote || null,
      tipo,
      date,
      time,
      notas: notas || "",
    });
    await appointment.save();

    res.status(201).json({ success: true, info: appointment });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/appointments/me", auth, async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.auth.id })
      .populate("artista", "nombre_artistico")
      .populate("quote")
      .sort({ date: 1, time: 1 });
    res.json({ success: true, info: appointments });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/appointments", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("user", "name email")
      .populate("artista", "nombre_artistico")
      .sort({ date: 1, time: 1 });
    res.json({ success: true, info: appointments });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/appointments/:id/cancel", auth, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: "Cita no encontrada" });
    const isAdmin = (req.auth?.roles || []).includes("admin");
    if (!isAdmin && appt.user.toString() !== req.auth.id) {
      return res.status(403).json({ success: false, message: "No puedes cancelar la cita de otro usuario" });
    }
    appt.estado = "cancelada";
    await appt.save();
    res.json({ success: true, info: appt });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;