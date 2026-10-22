/**
 * Migra a Cloudinary los archivos que hoy están en el disco local (/uploads/...)
 * y actualiza las URLs guardadas en la base de datos.
 *
 *   node scripts/migrateUploadsToCloudinary.js           → simulación (no sube ni modifica nada)
 *   node scripts/migrateUploadsToCloudinary.js --apply   → sube y actualiza la base de datos
 *
 * Requisitos: MONGO_URI, DB_NAME y credenciales de Cloudinary en backend/.env, y la carpeta
 * de uploads (UPLOADS_DIR o backend/uploads) con los archivos originales.
 * Los archivos locales NO se borran: puedes eliminarlos tú cuando verifiques el resultado.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import connectDB from "../config/database.js";
import Portfolio from "../models/Portfolio.model.js";
import Artist from "../models/Artist.model.js";
import User from "../models/User.model.js";
import Style from "../models/Style.model.js";
import SiteContent from "../models/SiteContent.model.js";
import { uploadsDir, uploadPathToCloudinary } from "../services/storage.js";

const APPLY = process.argv.includes("--apply");
const LOCAL = /^\/uploads\//;

const TARGETS = [
  { label: "Portfolio.imagenes_urls", model: Portfolio, field: "imagenes_urls", isArray: true },
  { label: "Artist.foto_url", model: Artist, field: "foto_url" },
  { label: "User.foto_url", model: User, field: "foto_url" },
  { label: "Style.imagen_referencia_url", model: Style, field: "imagen_referencia_url" },
  { label: "SiteContent.value", model: SiteContent, field: "value" },
];

const stats = { encontrados: 0, subidos: 0, faltantes: 0, errores: 0, documentos: 0 };
const yaSubidos = new Map(); // "/uploads/x.jpg" → URL nueva (evita subir dos veces el mismo archivo)

/** Devuelve la URL nueva, o null si no se pudo / no corresponde migrar. */
async function migrarUrl(url) {
  if (typeof url !== "string" || !LOCAL.test(url)) return null;
  stats.encontrados++;
  if (yaSubidos.has(url)) return yaSubidos.get(url);

  const archivo = path.join(uploadsDir(), path.basename(url));
  if (!fs.existsSync(archivo)) {
    stats.faltantes++;
    console.warn(`  ✗ no existe en disco: ${url}`);
    return null;
  }
  if (!APPLY) {
    console.log(`  · se subiría: ${url}`);
    return null;
  }
  try {
    const nueva = await uploadPathToCloudinary(archivo);
    yaSubidos.set(url, nueva);
    stats.subidos++;
    console.log(`  ✓ ${url} → ${nueva}`);
    return nueva;
  } catch (error) {
    stats.errores++;
    console.error(`  ✗ error subiendo ${url}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log(APPLY ? "MODO APLICAR: se subirán archivos y se actualizará la base de datos.\n" : "SIMULACIÓN (agrega --apply para ejecutar de verdad).\n");
  await connectDB();

  for (const { label, model, field, isArray } of TARGETS) {
    console.log(`\n${label}`);
    const docs = await model.find({ [field]: LOCAL }).select(field).lean();
    if (!docs.length) console.log("  (nada que migrar)");

    for (const doc of docs) {
      if (isArray) {
        const originales = doc[field] || [];
        const nuevas = await Promise.all(originales.map(async (u) => (await migrarUrl(u)) || u));
        if (nuevas.some((u, i) => u !== originales[i])) {
          await model.updateOne({ _id: doc._id }, { $set: { [field]: nuevas } });
          stats.documentos++;
        }
      } else {
        const nueva = await migrarUrl(doc[field]);
        if (nueva) {
          await model.updateOne({ _id: doc._id }, { $set: { [field]: nueva } });
          stats.documentos++;
        }
      }
    }
  }

  console.log("\n─ Resumen ─");
  console.log(`URLs locales encontradas: ${stats.encontrados}`);
  console.log(`Subidas a Cloudinary:     ${stats.subidos}`);
  console.log(`Documentos actualizados:  ${stats.documentos}`);
  console.log(`Sin archivo en disco:     ${stats.faltantes}`);
  console.log(`Errores:                  ${stats.errores}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Falló la migración:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
