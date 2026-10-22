import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Portfolio from "../models/Portfolio.model.js";
import Artist from "../models/Artist.model.js";
import { removeStoredFile } from "../services/storage.js";

const router = express.Router();

// Solo estos campos se aceptan desde el cliente (evita asignar campos arbitrarios).
const PORTFOLIO_FIELDS = ["artist", "styles", "titulo", "descripcion", "imagenes_urls", "zona_corporal", "destacado"];
const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

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
    if (typeof req.query.artist === "string" && req.query.artist) filter.artist = req.query.artist;
    if (typeof req.query.style === "string" && req.query.style) filter.styles = req.query.style;
    const items = await Portfolio.find(filter)
      .populate("artist", "nombre_artistico")
      .populate("styles", "nombre")
      .sort({ createdAt: -1 });
    res.json({ success: true, info: items });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Crear pieza (artista o admin).
// Un artista solo publica a su propio nombre; solo el admin elige el artista.
router.post("/portfolio", auth, authorizeRoles("artista", "admin"), async (req, res) => {
  try {
    const data = pick(req.body, PORTFOLIO_FIELDS);
    const isAdmin = (req.auth?.roles || []).includes("admin");

    if (isAdmin) {
      if (!data.artist) {
        return res.status(400).json({ success: false, message: "Debes indicar el artista de la pieza" });
      }
    } else {
      const myArtist = await Artist.findOne({ user: req.auth.id });
      if (!myArtist || !myArtist.activo) {
        return res.status(403).json({ success: false, message: "No tienes un perfil de artista activo" });
      }
      data.artist = myArtist._id;
    }

    const item = new Portfolio(data);
    await item.save();
    const populated = await item.populate("styles", "nombre");
    res.status(201).json({ success: true, info: populated });
  } catch (e) {
    if (e.name === "ValidationError" || e.name === "CastError") {
      return res.status(400).json({ success: false, message: "Datos de la pieza no válidos" });
    }
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

// Editar pieza (artista dueño o admin)
router.put("/portfolio/:id", auth, authorizeRoles("artista", "admin"), async (req, res) => {
  try {
    const owned = await findOwnedItemOrRespond(req, res);
    if (!owned) return; // ya se respondió 404 o 403

    const datos = pick(req.body, PORTFOLIO_FIELDS);
    // Un artista no-admin no puede reasignar la pieza a otro artista
    const isAdmin = (req.auth?.roles || []).includes("admin");
    if (!isAdmin) delete datos.artist;

    const item = await Portfolio.findByIdAndUpdate(req.params.id, datos, { new: true, runValidators: true })
      .populate("styles", "nombre")
      .populate("artist", "nombre_artistico");

    // Imágenes que la pieza ya no usa: se borran del almacenamiento (sin bloquear la respuesta).
    if (datos.imagenes_urls) {
      const aunUsadas = new Set(item.imagenes_urls);
      owned.imagenes_urls.filter((url) => !aunUsadas.has(url)).forEach((url) => removeStoredFile(url));
    }
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
    owned.imagenes_urls.forEach((url) => removeStoredFile(url));
    res.json({ success: true, message: "Pieza eliminada" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;