import mongoose from "mongoose";
import Pricing from "../models/Pricing.model.js";

// Precios estimados cuando no hay ninguna tarifa cargada (mismos valores del chatbot).
const PRECIOS_ESTIMADOS = {
  "pequeño": { min: 30000, max: 80000 },
  mediano: { min: 80000, max: 200000 },
  grande: { min: 200000, max: 450000 },
  manga: { min: 450000, max: 900000 },
  espalda_completa: { min: 500000, max: 1200000 },
};

// Las mangas y espaldas completas se guardan con una zona propia, sin importar la zona exacta elegida.
const ZONAS_ESPECIALES = { manga: "Manga completa", espalda_completa: "Espalda completa" };

const quitarLado = (zona) => zona.trim().replace(/ (izquierd[oa]|derech[oa])$/, "");

/**
 * Resuelve el precio de una cotización. Orden:
 *  1. tarifa del artista indicado
 *  2. rango del estudio (mínimo y máximo entre todos los artistas con tarifa para esa zona y tamaño)
 *  3. precio estimado por tamaño
 * Devuelve { min, max, fuente: "artista" | "estudio" | "estimado" } o null si no hay datos para ese tamaño.
 */
export async function resolveQuote({ artistId, zona, tamanio }) {
  if (typeof tamanio !== "string" || !tamanio) return null;

  const zonaTarifa = ZONAS_ESPECIALES[tamanio] || (typeof zona === "string" ? quitarLado(zona) : "");
  if (zonaTarifa) {
    const filtro = { zona_corporal: zonaTarifa, tamanio };

    if (artistId && mongoose.isValidObjectId(artistId)) {
      const propia = await Pricing.findOne({ ...filtro, artist: artistId }).lean();
      if (propia) return { min: propia.precio_min_clp, max: propia.precio_max_clp, fuente: "artista" };
    }

    const [rango] = await Pricing.aggregate([
      { $match: filtro },
      { $group: { _id: null, min: { $min: "$precio_min_clp" }, max: { $max: "$precio_max_clp" } } },
    ]);
    if (rango) return { min: rango.min, max: rango.max, fuente: "estudio" };
  }

  const estimado = PRECIOS_ESTIMADOS[tamanio];
  return estimado ? { ...estimado, fuente: "estimado" } : null;
}