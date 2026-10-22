import mongoose from "mongoose";

// Contenido editable del sitio guarda el video de
// Cuidados; sirve también para futuros banners o textos.
const siteContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("SiteContent", siteContentSchema);