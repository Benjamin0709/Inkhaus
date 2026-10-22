import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import ChatbotQuery from "../models/ChatbotQuery.model.js";

const router = express.Router();

// Público: el chatbot llama esto cada vez que no encuentra respuesta
// en la base de conocimiento (findFaqAnswer devuelve null).
router.post("/chatbot-queries", async (req, res) => {
  try {
    const { mensaje, nombre, email, pagina } = req.body;
    if (!mensaje?.trim()) {
      return res.status(400).json({ success: false, message: "El mensaje es obligatorio" });
    }
    const item = new ChatbotQuery({
      mensaje: mensaje.trim(),
      nombre: nombre || "",
      email: email || "",
      pagina: pagina || "",
    });
    await item.save();
    res.status(201).json({ success: true, info: item });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Admin: listar todas, más recientes primero
router.get("/chatbot-queries", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const items = await ChatbotQuery.find().sort({ createdAt: -1 });
    res.json({ success: true, info: items });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Admin: marcar como atendida y/o dejar una nota
router.put("/chatbot-queries/:id", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const { atendida, nota_admin } = req.body;
    const update = {};
    if (typeof atendida === "boolean") update.atendida = atendida;
    if (nota_admin !== undefined) update.nota_admin = nota_admin;
    const item = await ChatbotQuery.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return res.status(404).json({ success: false, message: "Registro no encontrado" });
    res.json({ success: true, info: item });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;