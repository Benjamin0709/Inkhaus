import mongoose from "mongoose";

// Registra las preguntas de texto libre que el chatbot NO logró// responder con la base de conocimiento (findFaqAnswer devolvió null).
// Sirve como bandeja de "Reportes" para que el admin vea qué se les
// está preguntando y, mientras no exista el chat en vivo, pueda dejar
// una nota o contactar manualmente al usuario.

const chatbotQuerySchema = new mongoose.Schema(
  {
    mensaje: { type: String, required: true, trim: true },
    nombre: { type: String, default: "" },
    email: { type: String, default: "" },
    pagina: { type: String, default: "" }, // desde qué ruta se preguntó
    atendida: { type: Boolean, default: false },
    nota_admin: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("ChatbotQuery", chatbotQuerySchema);