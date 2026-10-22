import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import ContactMessage from "../models/ContactMessage.model.js";
import { sendContactNotificationEmail, sendContactConfirmationEmail } from "../services/email.service.js";

const router = express.Router();

// Público: envío del formulario
router.post("/contact", async (req, res) => {
  try {
    const { nombre, email, telefono, mensaje } = req.body;
    if (!nombre?.trim() || !email?.trim() || !mensaje?.trim()) {
      return res.status(400).json({ success: false, message: "Nombre, correo y mensaje son obligatorios" });
    }

    const item = new ContactMessage({ nombre, email, telefono, mensaje });
    await item.save();

    sendContactNotificationEmail({ nombre, email, telefono, mensaje }).catch(() => {});
    sendContactConfirmationEmail({ nombre, email, mensaje }).catch(() => {});

    res.status(201).json({ success: true, message: "Mensaje enviado. Te responderemos pronto." });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Admin: listar mensajes recibidos
router.get("/contact", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const items = await ContactMessage.find().sort({ createdAt: -1 });
    res.json({ success: true, info: items });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/contact/:id", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const item = await ContactMessage.findByIdAndUpdate(req.params.id, { atendido: !!req.body.atendido }, { new: true });
    res.json({ success: true, info: item });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;