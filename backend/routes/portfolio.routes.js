import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Portfolio from "../models/Portfolio.model.js";
import Artist from "../models/Artist.model.js";

const router = express.Router();

// ── Verifica que el usuario logueado sea admin, o el artista dueño de
// la pieza de portafolio con ese id. Devuelve el item si todo OK, o
// responde el error y devuelve null para que el handler corte. ──
async function findOwnedItemOrRespond(req, res) {
  const item = await Portfolio.findById(req.params.id);
  if (!item) {
    res.status(404).json({ success: false, message: "Pieza de portafolio no encontrada" });
    return null;
  }

  const isAdmin = (req.auth?.roles || []).includes("admin");
  if (isAdmin) return item;

  const artist = await Artist.findById(item.artist).select("user");
  const isOwner = artist && artist.user.toString() === req.auth.id;
  if (!isOwner) {
    res.status(403).json({ success: false, message: "No puedes editar o eliminar el trabajo de otro artista" });
    return null;
  }
  return item;
}

router.get("/portfolio", async (req, res) => {
  try {
    const filter = {};
    if (req.query.artist) filter.artist = req.query.artist;
    if (req.query.style) filter.styles = req.query.style;
    const items = await Portfolio.find(filter)
      .populate("artist", "nombre_artistico")
      .populate("styles", "nombre")
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
    const populated = await item.populate("styles", "nombre");
    res.status(201).json({ success: true, info: populated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Editar pieza (artista dueño o admin)
router.put("/portfolio/:id", auth, authorizeRoles("artista", "admin"), async (req, res) => {
  try {
    const owned = await findOwnedItemOrRespond(req, res);
    if (!owned) return; // ya se respondió 404 o 403

    const datos = { ...req.body };
    // Un artista no-admin no puede reasignar la pieza a otro artista
    const isAdmin = (req.auth?.roles || []).includes("admin");
    if (!isAdmin) delete datos.artist;

    const item = await Portfolio.findByIdAndUpdate(req.params.id, datos, { new: true })
      .populate("styles", "nombre")
      .populate("artist", "nombre_artistico");
    res.json({ success: true, info: item });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Eliminar pieza (artista dueño o admin)
router.delete("/portfolio/:id", auth, authorizeRoles("artista", "admin"), async (req, res) => {
  try {
    const owned = await findOwnedItemOrRespond(req, res);
    if (!owned) return; 

    await Portfolio.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Pieza eliminada" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;