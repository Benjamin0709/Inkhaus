import mongoose from "mongoose";

// Tabla de precios: f(zona, tamaño, estilo) = rango CLP
const pricingSchema = new mongoose.Schema(
  {
    style: { type: mongoose.Schema.Types.ObjectId, ref: "Style" },
    zona_corporal: { type: String, required: true, trim: true },
    tamanio: {
      type: String,
      enum: ["pequeño", "mediano", "grande", "manga", "espalda_completa", "custom"],
      required: true,
    },
    precio_min_clp: { type: Number, required: true },
    precio_max_clp: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Pricing", pricingSchema);
