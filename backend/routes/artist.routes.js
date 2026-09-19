import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Artist from "../models/Artist.model.js";
import User from "../models/User.model.js";
import Portfolio from "../models/Portfolio.model.js";
import Appointment from "../models/Appointment.model.js";

const router = express.Router();

// Listar artistas activos (público)
router.get("/artists", async (req, res) => {
  try {
    const artists = await Artist.find({ activo: true }).populate("user", "name email foto_url");
    res.json({ success: true, info: artists });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Listar TODOS los artistas incluyendo desactivados (admin, para el panel)
router.get("/artists/all", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const artists = await Artist.find().populate("user", "name email foto_url").sort({ createdAt: -1 });
    res.json({ success: true, info: artists });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/artists/me", auth, async (req, res) => {
  try {
    const artist = await Artist.findOne({ user: req.auth.id });
    if (!artist) {
      return res.status(404).json({ success: false, message: "Todavía no tienes un perfil de artista asociado. Pide a un admin que lo cree." });
    }
    res.json({ success: true, info: artist });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Detalle artista (público)
router.get("/artists/:id", async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id).populate("user", "name email foto_url");
    if (!artist) return res.status(404).json({ success: false, message: "Artista no encontrado" });
    res.json({ success: true, info: artist });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Crear artista "crudo" (ya existía; requiere que el User ya exista)
router.post("/artists", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const artist = new Artist(req.body);
    await artist.save();
    res.status(201).json({ success: true, info: artist });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/artists/full", auth, authorizeRoles("admin"), async (req, res) => {
  const { name, email, password, nombre_artistico, bio, instagram, especialidades, horarios, foto_url } = req.body;

  if (!name?.trim() || !email?.trim() || !password || !nombre_artistico?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Nombre, correo, clave provisional y nombre artístico son obligatorios",
    });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: "La clave provisional debe tener al menos 8 caracteres" });
  }

  const existente = await User.findOne({ email: email.trim().toLowerCase() });
  if (existente) {
    return res.status(400).json({ success: false, message: "Ese correo ya está registrado" });
  }

  let user;
  try {
    user = new User({ name, email, password, roles: ["artista"] });
    await user.save(); // password se hashea solo (pre-save hook del modelo)

    const artist = new Artist({
      user: user._id,
      nombre_artistico,
      bio: bio || "",
      instagram: instagram || "",
      especialidades: especialidades || [],
      horarios: horarios || [],
      foto_url: foto_url || "",
    });
    await artist.save();

    res.status(201).json({
      success: true,
      info: { ...artist.toObject(), user: { id: user._id, name: user.name, email: user.email } },
    });
  } catch (e) {
    // Si el Artist falló después de crear el User, no dejamos un User huérfano
    if (user?._id) await User.findByIdAndDelete(user._id).catch(() => {});
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Editar artista completo (admin): datos del Artist + datos básicos
// del User asociado (nombre, email). El password NO se toca acá —
// eso requeriría un flujo separado de "resetear clave". ──────────────
router.put("/artists/:id/full", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const { name, email, nombre_artistico, bio, instagram, especialidades, horarios, foto_url, activo } = req.body;

    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.status(404).json({ success: false, message: "Artista no encontrado" });

    // Si cambia el email, verificar que no choque con otro usuario
    if (email && email.trim().toLowerCase() !== "") {
      const emailNormalizado = email.trim().toLowerCase();
      const otroUsuario = await User.findOne({ email: emailNormalizado, _id: { $ne: artist.user } });
      if (otroUsuario) {
        return res.status(400).json({ success: false, message: "Ese correo ya lo usa otro usuario" });
      }
      await User.findByIdAndUpdate(artist.user, {
        ...(name?.trim() ? { name: name.trim() } : {}),
        email: emailNormalizado,
      });
    } else if (name?.trim()) {
      await User.findByIdAndUpdate(artist.user, { name: name.trim() });
    }

    artist.nombre_artistico = nombre_artistico ?? artist.nombre_artistico;
    artist.bio = bio ?? artist.bio;
    artist.instagram = instagram ?? artist.instagram;
    artist.especialidades = especialidades ?? artist.especialidades;
    artist.horarios = horarios ?? artist.horarios;
    artist.foto_url = foto_url ?? artist.foto_url;
    if (typeof activo === "boolean") artist.activo = activo;
    await artist.save();

    const updated = await Artist.findById(artist._id).populate("user", "name email foto_url");
    res.json({ success: true, info: updated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Editar artista (versión simple): admin edita cualquiera; un
// artista solo puede editar SU PROPIO perfil, y solo campos visibles
// (no puede tocar "activo" ni reasignar "user"). ─────────────────────
router.put("/artists/:id", auth, authorizeRoles("admin", "artista"), async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.status(404).json({ success: false, message: "Artista no encontrado" });

    const isAdmin = (req.auth?.roles || []).includes("admin");
    if (!isAdmin && artist.user.toString() !== req.auth.id) {
      return res.status(403).json({ success: false, message: "No puedes editar el perfil de otro artista" });
    }

    let datos = { ...req.body };
    if (!isAdmin) {
      const permitido = ["nombre_artistico", "bio", "instagram", "especialidades", "horarios", "foto_url"];
      datos = Object.fromEntries(Object.entries(datos).filter(([k]) => permitido.includes(k)));
    }

    const updated = await Artist.findByIdAndUpdate(req.params.id, datos, { new: true })
      .populate("user", "name email foto_url");
    res.json({ success: true, info: updated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Desactivar artista (borrado lógico, no elimina historial de citas/portafolio)
router.delete("/artists/:id", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const artist = await Artist.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!artist) return res.status(404).json({ success: false, message: "Artista no encontrado" });
    res.json({ success: true, message: "Artista desactivado" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Reactivar artista desactivado
router.put("/artists/:id/reactivate", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const artist = await Artist.findByIdAndUpdate(req.params.id, { activo: true }, { new: true });
    if (!artist) return res.status(404).json({ success: false, message: "Artista no encontrado" });
    res.json({ success: true, info: artist });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Eliminación DEFINITIVA de la base de datos ──────────────────────
// Borra el Artist, su User asociado, y desvincula (no borra) sus
// piezas de portafolio y citas para no perder historial de negocio;
// simplemente quedan sin artista asociado.
router.delete("/artists/:id/permanent", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.status(404).json({ success: false, message: "Artista no encontrado" });

    const hasAppointments = await Appointment.exists({ artista: artist._id, estado: { $in: ["pendiente", "confirmada"] } });
    if (hasAppointments) {
      return res.status(400).json({
        success: false,
        message: "Este artista tiene citas pendientes o confirmadas. Cancélalas o reasígnalas antes de eliminarlo definitivamente.",
      });
    }

    await Portfolio.updateMany({ artist: artist._id }, { $unset: { artist: "" } });
    await User.findByIdAndDelete(artist.user).catch(() => {});
    await Artist.findByIdAndDelete(artist._id);

    res.json({ success: true, message: "Artista eliminado definitivamente" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;