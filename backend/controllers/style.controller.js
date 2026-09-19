import Style from "../models/Style.model.js";

// ─── LISTAR (público — el chatbot y el admin lo usan) ─────
export const getStyles = async (req, res) => {
  try {
    const styles = await Style.find().sort({ nombre: 1 });
    res.json({ success: true, info: styles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREAR (solo admin) ────────────────────────────────────
export const createStyle = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim()) {
      return res.status(400).json({ success: false, message: "El nombre del estilo es obligatorio" });
    }
    const existente = await Style.findOne({ nombre: nombre.trim() });
    if (existente) {
      return res.status(400).json({ success: false, message: "Ese estilo ya existe" });
    }
    const style = new Style(req.body);
    await style.save();
    res.status(201).json({ success: true, info: style });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};