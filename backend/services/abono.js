const PCT = Number(process.env.ABONO_PORCENTAJE || 20) / 100;
const MIN = Number(process.env.ABONO_MINIMA_CLP || 10000);
const MAX = Number(process.env.ABONO_MAXIMA_CLP || 100000);
const FIJA_AJUSTE = Number(process.env.ABONO_AJUSTE_CLP || 10000);
const FIJA_SESION = Number(process.env.ABONO_SESION_CLP || 30000);

const PRECIO_MAXIMO_CLP = 10_000_000;

/**
 * Calcula el abono en CLP. Siempre en el servidor: nunca se acepta un monto del cliente.
 *  - ajuste: monto fijo
 *  - sesión con cotización: ABONO_PORCENTAJE % del precio mínimo, redondeado a miles y acotado entre MIN y MAX
 *  - sesión sin cotización: monto fijo
 */
export function calcularAbono({ tipo, cotizacion }) {
  if (tipo === "ajuste") return FIJA_AJUSTE;
  const base = Number(cotizacion?.min);
  if (base > 0) {
    const raw = Math.round((base * PCT) / 1000) * 1000;
    return Math.min(Math.max(raw, MIN), MAX);
  }
  return FIJA_SESION;
}

/**
 * Sanea la cotización que envía el chatbot: solo zona, tamaño y estilo.
 * El precio NO se toma del cliente: lo resuelve el servidor (services/quote.js).
 */
export function sanitizeCotizacion(cot) {
  if (!cot || typeof cot !== "object") return undefined;
  const texto = (v, largo) => (typeof v === "string" ? v.trim().slice(0, largo) : "");
  const tamanio = texto(cot.tamanio, 30);
  if (!tamanio) return undefined;
  return {
    zona: texto(cot.zona, 60),
    tamanio,
    estilo: texto(cot.estilo, 40),
  };
}