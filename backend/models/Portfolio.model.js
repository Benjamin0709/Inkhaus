import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema(
  {
    artist: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", required: true },
    styles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Style" }],
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "" },
    imagenes_urls: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Debe incluir al menos una imagen",
      },
    },
    zona_corporal: { type: String, default: "" },
    destacado: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Portfolio", portfolioSchema);