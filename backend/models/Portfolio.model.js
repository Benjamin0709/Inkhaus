import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema(
  {
    artist: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", required: true },
    style: { type: mongoose.Schema.Types.ObjectId, ref: "Style" },
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "" },
    imagen_url: { type: String, required: true },
    zona_corporal: { type: String, default: "" },
    destacado: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Portfolio", portfolioSchema);
