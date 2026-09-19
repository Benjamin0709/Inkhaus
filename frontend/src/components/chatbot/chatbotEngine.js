// ─────────────────────────────────────────────────────────────────────────
// chatbotEngine.js
// Datos estáticos + helpers puros (sin React) del chatbot de cotización
// guiado por planimetría corporal 3D.
// ─────────────────────────────────────────────────────────────────────────

export const QUICK_ZONES = [
  "Bíceps",
  "Antebrazo",
  "Pecho",
  "Espalda alta",
  "Muslo",
  "Pantorrilla",
];

export const BASE_SIZE_OPTIONS = [
  { label: "Pequeño (< 5 cm)", value: "pequeño" },
  { label: "Mediano (5–15 cm)", value: "mediano" },
  { label: "Grande (> 15 cm)", value: "grande" },
];
const MANGA_OPTION = { label: "Manga completa", value: "manga" };
const ESPALDA_OPTION = { label: "Espalda completa", value: "espalda_completa" };

export const SIZE_OPTIONS = [...BASE_SIZE_OPTIONS, MANGA_OPTION, ESPALDA_OPTION];

const ARM_ZONES = ["Bíceps", "Antebrazo", "Muñeca"];
const BACK_ZONES = ["Espalda alta", "Espalda baja"];

export function getSizeOptionsForZone(zona) {
  const base = zoneBase(zona);
  const opts = [...BASE_SIZE_OPTIONS];
  if (ARM_ZONES.includes(base)) opts.push(MANGA_OPTION);
  if (BACK_ZONES.includes(base)) opts.push(ESPALDA_OPTION);
  return opts;
}

export const SIZE_TO_DB_ENUM = {
  pequeño: "pequeño",
  mediano: "mediano",
  grande: "grande",
  manga: "manga",
  espalda_completa: "espalda_completa",
};

export const STYLE_OPTIONS = [
  "Realismo",
  "Black & Gray",
  "Blackwork",
  "Geometría",
  "Anime",
  "Acuarela",
];

export const FALLBACK_PRICES = {
  pequeño: { min: 30000, max: 80000 },
  mediano: { min: 80000, max: 200000 },
  grande: { min: 200000, max: 450000 },
  manga: { min: 450000, max: 900000 },
  espalda_completa: { min: 500000, max: 1200000 },
};

export const ZONE_TIPS = {
  Cabeza: "Dolor alto y cicatrización especial — no es la mejor opción para un primer tatuaje.",
  Cuello: "Piel sensible, dolor medio-alto. Muy visible, conviene pensarlo con calma.",
  Pecho: "Dolor medio. Buena superficie para piezas grandes y con detalle.",
  "Espalda alta": "Dolor bajo-medio. Ideal para piezas grandes tipo espalda completa.",
  Abdomen: "Dolor medio, algo más sensible cerca de las costillas.",
  "Espalda baja": "Dolor bajo. Clásica y versátil para varios tamaños.",
  Cadera: "Dolor medio. Sigue la curva natural del cuerpo, linda para diseños orgánicos.",
  Bíceps: "Dolor bajo. Una de las zonas más elegidas para un primer tatuaje.",
  Antebrazo: "Dolor bajo. Muy versátil y con excelente visibilidad.",
  Muñeca: "Piel fina y hueso cerca de la superficie: dolor medio-alto. Mejor para diseños pequeños.",
  Mano: "Dolor alto y la tinta se desgasta más rápido — puede necesitar retoques a futuro.",
  Muslo: "Dolor bajo. Excelente superficie para piezas grandes o muy detalladas.",
  Pantorrilla: "Dolor bajo-medio. Buena para diseños verticales o de gran tamaño.",
  Pie: "Dolor alto y cicatrización más lenta por el roce del calzado.",
};

export function zoneBase(zona) {
  return (zona || "").replace(/ (izquierd[oa]|derech[oa])$/, "");
}

export function getZoneTip(zona) {
  return ZONE_TIPS[zoneBase(zona)] || null;
}

export function formatCLP(n) {
  return `$${Number(n).toLocaleString("es-CL")} CLP`;
}

function normalizeStyle(s) {
  return (s || "").trim().toLowerCase();
}

/**
 * Filtra la lista de artistas (respuesta real de /api/artists) según el
 * estilo elegido en el chat, comparando contra `especialidades`.
 * No auto-asigna: devuelve TODOS los que calzan para que el usuario elija.
 */
export function matchArtistsByStyle(artistList, estilo) {
  const target = normalizeStyle(estilo);
  return (artistList || []).filter((a) =>
    (a.especialidades || []).some((e) => normalizeStyle(e) === target)
  );
}

// (Preparado para el punto 4, aún no se usa)
export function portfolioUrlForArtist(artist) {
  const params = new URLSearchParams();
  if (artist?.id) params.set("artist", artist.id);
  if (artist?.nombre) params.set("artistName", artist.nombre);
  return `/?${params.toString()}#portfolio`;
}

// Opción para volver a elegir la zona sin reiniciar toda la conversación
export const CAMBIAR_ZONA = "Elegir otra zona";

// Pasos de la conversación (para la barra de progreso del header)
export const STEPS = ["welcome", "zona", "tamanio", "estilo", "artista", "cotizacion"];
export const TOTAL_STEPS = STEPS.length;

// ─────────────────────────────────────────────────────────────────────────
// Base de conocimiento simple para responder consultas libres del usuario
// sin necesidad de derivarlas a un humano. No es IA: son coincidencias de
// palabras clave sobre preguntas frecuentes reales del rubro.
// ─────────────────────────────────────────────────────────────────────────
export const FAQ_KB = [
  {
    keywords: ["dolor", "duele", "doloroso", "duela"],
    answer:
      "El dolor depende mucho de la zona: costillas, muñeca y pies son de las más sensibles; bíceps, antebrazo, pantorrilla y muslo son de las menos dolorosas. Cuando elijas la zona en el modelo 3D te muestro el nivel de dolor específico.",
  },
  {
    keywords: ["cuidado", "cicatriz", "sanar", "curacion", "curación", "post", "cuido"],
    answer:
      "El cuidado post-tatuaje típico es: lavar con jabón neutro 2-3 veces al día los primeros días, aplicar crema cicatrizante sin perfume, evitar sol directo y piscina/mar por al menos 2 semanas, y no rascar la piel cuando empiece a pelar.",
  },
  {
    keywords: ["anticipo", "seña", "abono", "pagar con"],
    answer:
      "Para confirmar una cita se solicita un anticipo mediante Webpay Plus, que se descuenta del valor final del tatuaje al momento de la sesión.",
  },
  {
    keywords: ["horario", "atienden", "abren", "atencion", "atención"],
    answer: "El estudio atiende de martes a sábado, de 11:00 a 20:00 hrs. El horario exacto con cada artista se coordina al agendar.",
  },
  {
    keywords: ["ubicacion", "ubicación", "direccion", "dirección", "donde estan", "dónde están", "donde queda"],
    answer: "Estamos en Santiago, Chile. La dirección exacta se comparte al confirmar tu cita.",
  },
  {
    keywords: ["primera vez", "primer tatuaje", "es mi primera", "nunca me he tatuado"],
    answer:
      "Para un primer tatuaje recomendamos zonas de dolor bajo como bíceps, antebrazo o pantorrilla, y tamaños pequeños o medianos. ¡Puedo guiarte en la cotización cuando quieras!",
  },
  {
    keywords: ["edad", "menor de edad", "menores"],
    answer: "Se requiere ser mayor de 18 años, o contar con autorización notarial de un apoderado si eres menor de edad.",
  },
  {
    keywords: ["retoque", "retocar"],
    answer: "Los retoques dentro de los primeros 30 días por pérdida normal de tinta son sin costo. Pasado ese plazo se cotiza aparte.",
  },
  {
    keywords: ["embarazo", "embarazada", "lactancia"],
    answer: "No se realizan tatuajes durante el embarazo ni la lactancia, por seguridad de la piel y cicatrización.",
  },
];

/** Busca una respuesta en la base de conocimiento a partir de texto libre. */
export function findFaqAnswer(text) {
  const t = (text || "").toLowerCase();
  for (const item of FAQ_KB) {
    if (item.keywords.some((k) => t.includes(k))) return item.answer;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Detección de intención de cotización: si el usuario escribe directamente
// algo como "cuánto cuesta un tatuaje" o "quiero cotizar", lo llevamos al
// flujo guiado de zona/tamaño/estilo en vez de darle solo una respuesta de
// texto genérica.
// ─────────────────────────────────────────────────────────────────────────
export const QUOTE_KEYWORDS = [
  "cotiz", "precio", "precios", "costo", "cuesta", "cuestan",
  "cuanto vale", "cuánto vale", "cuanto sale", "cuánto sale",
  "cuanto cuesta", "cuánto cuesta", "vale un tatuaje", "valor",
  "presupuesto", "tarifa", "cuanto es", "cuánto es",
];

export function isQuoteIntent(text) {
  const t = (text || "").toLowerCase();
  return QUOTE_KEYWORDS.some((k) => t.includes(k));
}