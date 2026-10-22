import express from "express";
import { auth } from "../middleware/auth.js";
import Conversation from "../models/Conversation.model.js";
import Message from "../models/Message.model.js";
import Artist from "../models/Artist.model.js";

const router = express.Router();

// ── Helper: determina si req.auth puede ver/escribir esta conversación,
// y qué rol le corresponde al mensaje que envía. ──
async function resolveAccess(conversation, authUser) {
  const isAdmin = authUser.roles.includes("admin");
  const isCliente = conversation.cliente.toString() === authUser.id;

  let isArtistaDueño = false;
  let myArtistId = null;
  if (authUser.roles.includes("artista")) {
    const myArtist = await Artist.findOne({ user: authUser.id });
    if (myArtist) {
      myArtistId = myArtist._id;
      isArtistaDueño = conversation.artista && conversation.artista.toString() === myArtist._id.toString();
    }
  }

  // Conversaciones dirigidas al equipo (artista: null) las puede atender
  // cualquier admin — es la bandeja de fallback compartida.
  const isAdminFallback = isAdmin && conversation.artista === null;

  const canAccess = isAdmin || isCliente || isArtistaDueño;
  let rol = null;
  if (isCliente && !isAdmin && !isArtistaDueño) rol = "cliente";
  else if (isArtistaDueño) rol = "artista";
  else if (isAdmin) rol = "admin";

  return { canAccess, rol, isAdminFallback };
}

// ── Crear (o reutilizar) una conversación ───────────────────────────
// body: { artistaId?: string, origen?: 'manual'|'chatbot_fallback' }
// Sin artistaId -> conversación dirigida al equipo (artista: null).
router.post("/conversations", auth, async (req, res) => {
  try {
    const { artistaId, origen } = req.body;

    let artista = null;
    if (artistaId) {
      const artistDoc = await Artist.findById(artistaId);
      if (!artistDoc || !artistDoc.activo) {
        return res.status(404).json({ success: false, message: "Artista no disponible" });
      }
      artista = artistDoc._id;
    }

    let conversation = await Conversation.findOne({
      cliente: req.auth.id,
      artista,
      estado: "abierta",
    });

    if (!conversation) {
      conversation = new Conversation({
        cliente: req.auth.id,
        artista,
        origen: origen === "chatbot_fallback" ? "chatbot_fallback" : "manual",
      });
      await conversation.save();
    }

    const populated = await conversation.populate([
      { path: "cliente", select: "name email" },
      { path: "artista", select: "nombre_artistico foto_url" },
    ]);
    res.status(201).json({ success: true, info: populated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Mis conversaciones (según rol) ───────────────────────────────────
router.get("/conversations/me", auth, async (req, res) => {
  try {
    let filter;
    if (req.auth.roles.includes("admin")) {
      filter = { artista: null }; // bandeja de fallback / equipo
    } else if (req.auth.roles.includes("artista")) {
      const myArtist = await Artist.findOne({ user: req.auth.id });
      if (!myArtist) return res.json({ success: true, info: [] });
      filter = { artista: myArtist._id };
    } else {
      filter = { cliente: req.auth.id };
    }

    const conversations = await Conversation.find(filter)
      .populate("cliente", "name email")
      .populate("artista", "nombre_artistico foto_url")
      .sort({ ultima_actividad: -1 });

    res.json({ success: true, info: conversations });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Mensajes de una conversación ─────────────────────────────────────
router.get("/conversations/:id/messages", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversación no encontrada" });

    const { canAccess } = await resolveAccess(conversation, req.auth);
    if (!canAccess) return res.status(403).json({ success: false, message: "No autorizado" });

    const messages = await Message.find({ conversation: conversation._id })
      .populate("emisor", "name")
      .sort({ createdAt: 1 });

    res.json({ success: true, info: messages });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Enviar mensaje ────────────────────────────────────────────────────
router.post("/conversations/:id/messages", auth, async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ success: false, message: "El mensaje no puede estar vacío" });

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversación no encontrada" });

    const { canAccess, rol } = await resolveAccess(conversation, req.auth);
    if (!canAccess) return res.status(403).json({ success: false, message: "No autorizado" });

    const message = new Message({
      conversation: conversation._id,
      emisor: req.auth.id,
      emisor_rol: rol,
      texto: texto.trim(),
    });
    await message.save();

    conversation.ultimo_mensaje = texto.trim().slice(0, 140);
    conversation.ultima_actividad = new Date();
    if (conversation.estado === "cerrada") conversation.estado = "abierta";
    await conversation.save();

    const populated = await message.populate("emisor", "name");
    res.status(201).json({ success: true, info: populated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Cerrar conversación (artista dueño o admin) ─────────────────────
router.put("/conversations/:id/close", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversación no encontrada" });

    const { canAccess, rol } = await resolveAccess(conversation, req.auth);
    if (!canAccess || rol === "cliente") {
      return res.status(403).json({ success: false, message: "No autorizado para cerrar esta conversación" });
    }

    conversation.estado = "cerrada";
    await conversation.save();
    res.json({ success: true, info: conversation });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;