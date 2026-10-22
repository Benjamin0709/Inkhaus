// Tamaños que sí varían según la zona (van en la matriz zona × tamaño)
export const PRICE_ZONES = [
  "Cabeza", "Cuello", "Pecho", "Abdomen",
  "Espalda alta", "Espalda baja", "Cadera",
  "Bíceps", "Antebrazo", "Muñeca", "Mano",
  "Muslo", "Pantorrilla", "Pie",
];

export const pricingDocsToArray = (docs = []) =>
  docs.map((d) => ({
    zona: d.zona_corporal, tamanio: d.tamanio,
    precio_min: d.precio_min_clp, precio_max: d.precio_max_clp,
  }));
  
export const PRICE_SIZES = [
  { value: "pequeño", label: "Pequeño" },
  { value: "mediano", label: "Mediano" },
  { value: "grande", label: "Grande" },
];
export const SPECIAL_SIZES = [
  { value: "manga", label: "Manga completa", zonaLabel: "Manga completa" },
  { value: "espalda_completa", label: "Espalda completa", zonaLabel: "Espalda completa" },
];

export const priceKey = (zona, tamanio) => `${zona}|${tamanio}`;

export function formatCLP(n) {
  if (n === null || n === undefined || n === "") return "";
  return `$${Number(n).toLocaleString("es-CL")}`;
}

/** Convierte el arreglo tabla_precios (del backend) al objeto {key: {min,max}} usado por el editor. */
export function pricesArrayToMap(arr = []) {
  const map = {};
  arr.forEach((p) => {
    map[priceKey(p.zona, p.tamanio)] = { min: p.precio_min, max: p.precio_max };
  });
  return map;
}

/** Convierte el objeto {key: {min,max}} de vuelta al arreglo que espera el backend, omitiendo celdas vacías/incompletas. */
export function pricesMapToArray(map = {}) {
  const arr = [];
  for (const [key, val] of Object.entries(map)) {
    if (!val?.min || !val?.max) continue;
    const [zona, tamanio] = key.split("|");
    arr.push({ zona, tamanio, precio_min: Number(val.min), precio_max: Number(val.max) });
  }
  return arr;
}