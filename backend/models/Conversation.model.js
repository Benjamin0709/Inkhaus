import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // null = conversación dirigida al equipo/administración (fallback del
    // chatbot o consulta general), no a un artista específico.
    artista: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", default: null },
    origen: { type: String, enum: ["manual", "chatbot_fallback"], default: "manual" },
    estado: { type: String, enum: ["abierta", "cerrada"], default: "abierta" },
    ultimo_mensaje: { type: String, default: "" },
    ultima_actividad: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", conversationSchema);