/**
 * Diagnóstico de imágenes: revisa cada URL guardada en la base de datos y dice si carga.
 *
 *   node scripts/checkImages.js
 *
 * Solo LEE: no modifica la base de datos ni Cloudinary.
 * Revisa: Portfolio.imagenes_urls, Artist.foto_url y Style.imagen_referencia_url.
 *
 * Para cada URL informa:
 *   OK            → carga bien
 *   FALLA <código> + motivo (Cloudinary lo entrega en la cabecera x-cld-error)
 *   LOCAL FALTA   → es /uploads/... y el archivo ya no está en el disco del backend
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB from "../config/database.js";
import Portfolio from "../models/Portfolio.model.js";
import Artist from "../models/Artist.model.js";
import Style from "../models/Style.model.js";
import { uploadsDir } from "../services/storage.js";

const TIMEOUT_MS = 15000;
const sinTransformacion = (url) => url.replace("/image/upload/f_auto,q_auto/", "/image/upload/");

/** Pide la URL (HEAD, y GET si el servidor no admite HEAD). Devuelve { ok, status, motivo }. */
export async function probar(url) {
  const intentar = async (method) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, { method, signal: ctrl.signal, redirect: "follow" });
    } finally {
      clearTimeout(t);
    }
  };
  try {
    let res = await intentar("HEAD");
    if (res.status === 405 || res.status === 501) res = await intentar("GET");
    const tipo = res.headers.get("content-type") || "";
    const motivo = res.headers.get("x-cld-error") || "";
    // Un "200" que devuelve HTML no es una imagen (típico de /uploads mal enrutado al frontend).
    const esImagen = tipo.startsWith("image/") || tipo.startsWith("video/");
    return { ok: res.ok && esImagen, status: res.status, tipo, motivo };
  } catch (e) {
    return { ok: false, status: 0, tipo: "", motivo: e.name === "AbortError" ? "tiempo de espera agotado" : e.message };
  }
}

async function revisar(origen, url) {
  if (typeof url !== "string" || !url.trim()) return null;

  if (url.startsWith("/uploads/")) {
    const existe = fs.existsSync(path.join(uploadsDir(), path.basename(url)));
    return { origen, url, estado: existe ? "LOCAL OK (solo carga si el frontend apunta al backend)" : "LOCAL FALTA", ok: existe };
  }
  if (!/^https?:\/\//i.test(url)) return { origen, url, estado: "URL NO VÁLIDA", ok: false };

  const r = await probar(url);
  if (r.ok) return { origen, url, estado: "OK", ok: true };

  let extra = "";
  if (url.includes("/image/upload/f_auto,q_auto/")) {
    const r2 = await probar(sinTransformacion(url));
    extra = r2.ok
      ? "  → SIN f_auto,q_auto SÍ carga (activa 'Strict transformations' en Cloudinary o usa la URL sin transformación)"
      : "  → sin la transformación tampoco carga";
  }
  return { origen, url, estado: `FALLA ${r.status}${r.motivo ? ` · ${r.motivo}` : ""}${r.tipo ? ` · ${r.tipo}` : ""}${extra}`, ok: false };
}

async function main() {
  await connectDB();
  const tareas = [];

  for (const p of await Portfolio.find({}).select("titulo imagenes_urls").lean()) {
    for (const u of p.imagenes_urls || []) tareas.push([`Portafolio "${p.titulo}"`, u]);
  }
  for (const a of await Artist.find({}).select("nombre_artistico foto_url").lean()) {
    if (a.foto_url) tareas.push([`Foto de ${a.nombre_artistico}`, a.foto_url]);
  }
  for (const s of await Style.find({}).select("nombre imagen_referencia_url").lean()) {
    if (s.imagen_referencia_url) tareas.push([`Estilo ${s.nombre}`, s.imagen_referencia_url]);
  }

  console.log(`Revisando ${tareas.length} imágenes...\n`);
  const resultados = [];
  for (const [origen, url] of tareas) {
    const r = await revisar(origen, url);
    if (!r) continue;
    resultados.push(r);
    console.log(`${r.ok ? "✓" : "✗"} ${r.origen}\n    ${r.url}\n    ${r.estado}\n`);
  }

  const malas = resultados.filter((r) => !r.ok);
  console.log("─".repeat(60));
  console.log(`Total: ${resultados.length} · OK: ${resultados.length - malas.length} · con problema: ${malas.length}`);
  if (malas.length) {
    const porTipo = {};
    for (const m of malas) {
      const clave = m.estado.split("  →")[0].split(" · ")[0];
      porTipo[clave] = (porTipo[clave] || 0) + 1;
    }
    console.log("Resumen de problemas:", porTipo);
  }
  await mongoose.disconnect();
}

// Solo corre al ejecutarlo directamente (permite importar `probar` en pruebas).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async (e) => {
    console.error("Error:", e.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}
