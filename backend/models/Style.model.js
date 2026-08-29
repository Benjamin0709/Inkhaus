import mongoose from "mongoose";

const styleSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, unique: true },
    descripcion: { type: String, default: "" },
    imagen_referencia_url: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Style", styleSchema);
