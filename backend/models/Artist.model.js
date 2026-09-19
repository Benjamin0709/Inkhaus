import mongoose from "mongoose";

// Referencia al User con roles:["artista"]
// Se usa como perfil público del artista en el portafolio
const artistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    nombre_artistico: { type: String, required: true, trim: true },
    bio: { type: String, default: "", trim: true },
    instagram: { type: String, default: "", trim: true },
    especialidades: [{ type: String, trim: true }], // ["Realismo","Black & Gray"]
    horarios: [
      {
        dia: {
          type: String,
          enum: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"],
          required: true,
        },
        desde: { type: String, trim: true, required: true }, // "10:00"
        hasta: { type: String, trim: true, required: true }, // "18:00"
      },
    ],
    foto_url: { type: String, default: "" },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Artist", artistSchema);