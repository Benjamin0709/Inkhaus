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
const ESPALDA_OPTION = {
  label: "Espalda completa",
  value: "espalda_completa",
};
 
export const SIZE_OPTIONS = [
  ...BASE_SIZE_OPTIONS,
  MANGA_OPTION,
  ESPALDA_OPTION,
];
 
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
  Cabeza:
    "Dolor alto y cicatrización especial — no es la mejor opción para un primer tatuaje.",
  Cuello:
    "Piel sensible, dolor medio-alto. Muy visible, conviene pensarlo con calma.",
  Pecho:
    "Dolor medio. Buena superficie para piezas grandes y con detalle.",
  "Espalda alta":
    "Dolor medio-alto. Ideal para piezas grandes tipo espalda completa.",
  Abdomen:
    "Dolor medio, algo más sensible cerca de las costillas.",
  "Espalda baja":
    "Dolor medio. Clásica y versátil para varios tamaños.",
  Cadera:
    "Dolor medio. Sigue la curva natural del cuerpo, linda para diseños orgánicos.",
  Bíceps:
    "Dolor bajo. Una de las zonas más elegidas para un primer tatuaje.",
  Antebrazo:
    "Dolor bajo. Muy versátil y con excelente visibilidad.",
  Muñeca:
    "Piel fina y hueso cerca de la superficie: dolor medio-alto. Mejor para diseños pequeños.",
  Mano:
    "Dolor alto y la tinta se desgasta más rápido — puede necesitar retoques a futuro.",
  Muslo:
    "Dolor bajo. Excelente superficie para piezas grandes o muy detalladas.",
  Pantorrilla:
    "Dolor bajo-medio. Buena para diseños verticales o de gran tamaño.",
  Pie:
    "Dolor alto y cicatrización más lenta por el roce del calzado.",
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
 
/**
 * Normaliza el nombre de un estilo para compararlo:
 * sin acentos, en minúsculas, y con "&" tratado como "and"
 * (así "Black & Gray", "Black&Gray" y "black and gray" son el mismo estilo).
 */
export function normalizeStyle(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
 
/**
 * Filtra artistas según sus especialidades.
 * Tolera diferencias de mayúsculas, acentos y espacios.
 */
export function matchArtistsByStyle(artistList, estilo) {
  const target = normalizeStyle(estilo);
 
  if (!target) return [];
 
  return (artistList || []).filter((artist) =>
    (Array.isArray(artist.especialidades) ? artist.especialidades : [])
      .some((especialidad) => normalizeStyle(especialidad) === target)
  );
}
 
/**
 * Construye una URL para consultar el portafolio de un artista.
 */
export function portfolioUrlForArtist(artist) {
  const params = new URLSearchParams();
  if (artist?.id) params.set("artist", artist.id);
  if (artist?.nombre) params.set("artistName", artist.nombre);
  return `/?${params.toString()}#portfolio`;
}
 
export const CAMBIAR_ZONA = "Elegir otra zona";
 
export const STEPS = [
  "welcome",
  "zona",
  "tamanio",
  "estilo",
  "artista",
  "cotizacion",
];
 
export const TOTAL_STEPS = STEPS.length;
 
// ─────────────────────────────────────────────────────────────────────────
// BASE DE CONOCIMIENTO: PREGUNTAS FRECUENTES
// ─────────────────────────────────────────────────────────────────────────
export const FAQ_KB = [
  {
    keywords: [
      "dolor",
      "duele",
      "es doloroso",
      "duela",
      "me duele",
      "duele mucho",
    ],
    answer:
      "El dolor depende de la zona del cuerpo y de cada persona. Cuando elijas la zona en el modelo 3D, te mostraré información específica para orientarte.",
  },
  {
    keywords: [
      "cuidados del tatuaje",
      "cuidar el tatuaje",
      "cuidado del tatuaje",
      "cuidados despues del tatuaje",
      "como cuidar mi tatuaje",
      "cicatrizacion del tatuaje",
    ],
    answer:
      "Sigue las indicaciones de cuidado que te entregue tu artista y consulta con el estudio si tienes dudas sobre la cicatrización.",
  },
  {
    keywords: ["anticipo", "seña", "abono", "pagar con"],
    answer:
      "Para confirmar una cita se solicita un anticipo mediante Webpay Plus, que se descuenta del valor final del tatuaje al momento de la sesión.",
  },
  {
    keywords: [
      "horario",
      "atienden",
      "abren",
      "atencion",
      "dias",
    ],
    answer:
      "InkHaus atiende de lunes a sábado. La disponibilidad y el horario se coordinan según cada artista al momento de agendar una cita.",
  },
  {
    keywords: [
      "ubicacion",
      "direccion",
      "donde estan",
      "donde queda",
    ],
    answer:
      "Estamos en Santiago, Chile. La dirección exacta se comparte al confirmar tu cita.",
  },
  {
    keywords: [
      "primera vez",
      "primer tatuaje",
      "es mi primera",
      "nunca me he tatuado",
    ],
    answer:
      "Para un primer tatuaje recomendamos zonas de dolor bajo como bíceps, antebrazo o pantorrilla, y tamaños pequeños o medianos. ¡Puedo guiarte en la cotización cuando quieras!",
  },
  {
    keywords: [
      "edad",
      "menor de edad",
      "menores",
      "mayor de edad",
      "18 años",
      "apoderado",
      "autorizacion",
      "padre",
      "madre",
      "tutor",
      "responsable",
      "notarial",
      "notaria",
    ],
    answer:
      "Para tatuarte en InkHaus debes ser mayor de 18 años o contar con autorización notarial de tu apoderado si eres menor de edad.",
  },
  {
    keywords: [
      "retoque",
      "retocar",
      "retoques",
      "arreglar",
      "corregir",
      "reparar",
      "se perdio tinta",
      "se borro",
      "se desvanecio",
    ],
    answer:
      "Los retoques en InkHaus aplican únicamente a personas que se hayan tatuado en nuestro estudio y solo cuando exista pérdida de tinta propia del proceso normal de cicatrización. No se incluyen otros motivos de retoque.",
  },
  {
    keywords: ["embarazo", "embarazada", "lactancia"],
    answer:
      "No se realizan tatuajes durante el embarazo ni la lactancia, por seguridad de la piel y cicatrización.",
  },
  {
    keywords: ["alergia", "alergico", "reaccion"],
    answer:
      "Es poco común pero puede ocurrir una reacción alérgica a la tinta, especialmente a pigmentos rojos. Si tienes antecedentes de alergias de piel, coméntalo con tu artista antes de la sesión.",
  },
  {
    keywords: ["cover", "tapar", "cubrir tatuaje", "cover up"],
    answer:
      "Sí, hacemos cover-ups (tatuajes que cubren uno anterior). El resultado depende del tamaño, color y densidad del tatuaje original; es mejor evaluarlo con fotos durante la cotización.",
  },
  {
    keywords: [
      "cuanto dura",
      "tiempo de sesion",
      "cuantas horas",
    ],
    answer:
      "Depende del tamaño y detalle: un tatuaje pequeño puede tomar entre 1 y 2 horas, mientras que piezas grandes o muy detalladas pueden requerir varias sesiones de 4 a 6 horas cada una.",
  },
  {
    keywords: [
      "que mas puedes responder",
      "que puedes responder",
      "que mas sabes",
      "que sabes",
      "que puedes hacer",
      "que mas puedes hacer",
      "que sabes hacer",
      "en que me puedes ayudar",
      "en que me ayudas",
      "como me puedes ayudar",
      "como funcionas",
    ],
    answer:
      "Puedo ayudarte con: \n• Cotizar un tatuaje eligiendo la zona en el modelo 3D, el tamaño y el estilo.\n• Mostrarte los artistas de InkHaus y sus estilos.\n• Orientarte sobre diseños y portafolios.\n• Resolver dudas frecuentes: dolor, cuidados, anticipo, horarios, ubicación, edad, retoques, cover-ups y duración de la sesión.\nSi preguntas algo que no sé, puedo ponerte en contacto con el equipo.",
  },
  {
    keywords: [
      "diseño propio",
      "mi propio diseño",
      "traigo mi diseño",
      "dibujo propio",
    ],
    answer:
      "¡Por supuesto! Puedes traer tu propio diseño o referencia, y el artista lo adapta a su estilo y a la anatomía de la zona elegida. Te confirmará si es posible hacerlo antes de tatuarlo.",
  },
];
 
// ─────────────────────────────────────────────────────────────────────────
// NORMALIZACIÓN Y COINCIDENCIA DE TEXTO
// ─────────────────────────────────────────────────────────────────────────
 
function normalizeFaqText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
 
function matchesFaqKeyword(text, keyword) {
  const normalizedKeyword = normalizeFaqText(keyword);
 
  if (!normalizedKeyword) return false;
 
  return (` ${text} `).includes(` ${normalizedKeyword} `);
}
 
/**
 * Busca una respuesta en las preguntas frecuentes.
 * Devuelve null si no encuentra coincidencias.
 */
export function findFaqAnswer(text) {
  const normalizedText = normalizeFaqText(text);
 
  if (!normalizedText) return null;
 
  for (const item of FAQ_KB) {
    const matches = item.keywords.some((keyword) =>
      matchesFaqKeyword(normalizedText, keyword)
    );
 
    if (matches) return item.answer;
  }
 
  return null;
}
 
// ─────────────────────────────────────────────────────────────────────────
// DETECCIÓN DE CONSULTAS SOBRE ARTISTAS, ESTILOS Y DISEÑOS
// Estas funciones reconocen intenciones; no llaman a las API.
// ─────────────────────────────────────────────────────────────────────────
 
const ARTIST_QUERY_KEYWORDS = [
  "artista",
  "artistas",
  "tatuador",
  "tatuadores",
  "tatuadora",
  "tatuadoras",
  "quien tatua",
  "quienes tatúan",
  "quienes trabajan en inkhaus",
  "equipo de tatuadores",
  "equipo de artistas",
];
 
const STYLE_QUERY_KEYWORDS = [
  "estilo",
  "estilos",
  "que estilos tienen",
  "que estilos trabajan",
  "estilos disponibles",
  "tipos de tatuajes",
  "tecnicas de tatuaje",
  "tecnica de tatuaje",
];
 
const DESIGN_QUERY_KEYWORDS = [
  "diseño",
  "diseños",
  "diseno",
  "disenos",
  "referencia",
  "referencias",
  "portafolio",
  "portafolios",
  "galeria",
  "galerias",
  "ver trabajos",
  "ver tatuajes",
  "ideas para tatuajes",
  "inspiracion",
];
 
/**
 * Devuelve true si el usuario pregunta por los artistas del estudio.
 */
export function findArtistQuery(text) {
  const normalizedText = normalizeFaqText(text);
 
  if (!normalizedText) return false;
 
  return ARTIST_QUERY_KEYWORDS.some((keyword) =>
    matchesFaqKeyword(normalizedText, keyword)
  );
}
 
function mentionsStyleName(text, style) {
  const t = ` ${normalizeStyle(text)} `;
  const s = normalizeStyle(style);
  return Boolean(s) && t.includes(` ${s} `);
}
 
/**
 * Devuelve true si el usuario pregunta por los estilos disponibles.
 * `styles` es la lista de estilos reales (base de datos); por defecto, la lista fija.
 */
export function findStyleQuery(text, styles = STYLE_OPTIONS) {
  const normalizedText = normalizeFaqText(text);
 
  if (!normalizedText) return false;
 
  const asksAboutStyles = STYLE_QUERY_KEYWORDS.some((keyword) =>
    matchesFaqKeyword(normalizedText, keyword)
  );
 
  // También detecta preguntas como:
  const asksAboutAStyle = styles.some((style) => mentionsStyleName(text, style));
 
  return asksAboutStyles || asksAboutAStyle;
}
 
/**
 * Devuelve true si el usuario quiere ver diseños o referencias.
 */
export function findDesignQuery(text) {
  const normalizedText = normalizeFaqText(text);
 
  if (!normalizedText) return false;
 
  return DESIGN_QUERY_KEYWORDS.some((keyword) =>
    matchesFaqKeyword(normalizedText, keyword)
  );
}
 
/**
 * Devuelve el estilo (de la lista `styles`)
 */
export function findMentionedStyle(text, styles = STYLE_OPTIONS) {
  if (!normalizeStyle(text)) return null;
 
  return styles.find((style) => mentionsStyleName(text, style)) || null;
}
 
// ─────────────────────────────────────────────────────────────────────────
// RESPUESTAS DE CONVERSACIÓN COTIDIANA
// ─────────────────────────────────────────────────────────────────────────
 
export const SMALL_TALK = [
  {
    keywords: ["hola", "holi", "holaa", "holaaa", "buenas"],
    answer:
      "¡Hola! Bienvenido a InkHaus. Estoy aquí para ayudarte con tus dudas sobre tatuajes, artistas y citas. ¿Qué te gustaría saber?",
  },
  {
    keywords: [
      "como estas",
      "como te va",
      "que tal",
      "como ha estado tu dia",
    ],
    answer:
      "¡Muy bien, gracias por preguntar! ¿Y tú? Cuéntame, ¿en qué te puedo ayudar con tu tatuaje?",
  },
  {
    keywords: ["buenos dias"],
    answer:
      "¡Buenos días! Bienvenido a InkHaus. ¿En qué te puedo ayudar?",
  },
  {
    keywords: ["buenas tardes"],
    answer:
      "¡Buenas tardes! Bienvenido a InkHaus. ¿Qué te gustaría consultar?",
  },
  {
    keywords: ["buenas noches"],
    answer:
      "¡Buenas noches! Estoy aquí para ayudarte con tus consultas sobre InkHaus.",
  },
  {
    keywords: ["gracias", "muchas gracias", "te agradezco"],
    answer:
      "¡De nada! Si tienes otra duda sobre tu tatuaje o quieres cotizar, aquí estoy para ayudarte.",
  },
  {
    keywords: ["adios", "chao", "hasta luego", "nos vemos"],
    answer:
      "¡Hasta pronto! Gracias por contactar a InkHaus. ¡Que tengas un excelente día!",
  },
];
 
/**
 * Busca respuestas de conversación cotidiana.
 */
export function findSmallTalkAnswer(text) {
  const normalizedText = normalizeFaqText(text);
 
  if (!normalizedText) return null;
 
  for (const item of SMALL_TALK) {
    const matches = item.keywords.some((keyword) =>
      matchesFaqKeyword(normalizedText, keyword)
    );
 
    if (matches) return item.answer;
  }
 
  return null;
}
 
// ─────────────────────────────────────────────────────────────────────────
// DETECCIÓN DE INTENCIÓN DE COTIZACIÓN
// ─────────────────────────────────────────────────────────────────────────
export const QUOTE_KEYWORDS = [
  "cotiz",
  "precio",
  "precios",
  "costo",
  "cuesta",
  "cuestan",
  "cuanto vale",
  "cuanto sale",
  "cuanto cuesta",
  "vale un tatuaje",
  "valor",
  "presupuesto",
  "tarifa",
  "cuanto es",
];
 
export function isQuoteIntent(text) {
  const t = normalizeFaqText(text);
 
  return QUOTE_KEYWORDS.some((keyword) => t.includes(keyword));
}