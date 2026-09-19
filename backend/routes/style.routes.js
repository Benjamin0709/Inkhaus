import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import Style from "../models/Style.model.js";

const router = express.Router();

// Listar estilos (público) — usado por el Home para generar los cuadros
router.get("/styles", async (req, res) => {
  try {
    const styles = await Style.find().sort({ nombre: 1 });
    res.json({ success: true, info: styles });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Crear estilo (admin) — al crear uno nuevo, el Home genera su cuadro solo
router.post("/styles", auth, authorizeRoles("admin"), async (req, res) => {
  try {
    const style = new Style(req.body);
    await style.save();
    res.status(201).json({ success: true, info: style });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;