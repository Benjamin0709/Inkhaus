const PCT = Number(process.env.ABONO_PORCENTAJE || 20) / 100;
const MIN = Number(process.env.ABONO_MINIMA_CLP || 10000);
const MAX = Number(process.env.ABONO_MAXIMA_CLP || 100000);
const FIJA_AJUSTE = Number(process.env.ABONO_AJUSTE_CLP || 10000);
const FIJA_SESION = Number(process.env.ABONO_SESION_CLP || 30000);

/** Calcula el abono en CLP. Siempre en el servidor, nunca se acepta un monto del cliente. */
export function calcularabono({ tipo, cotizacion }) {
  if (tipo === "ajuste") return FIJA_AJUSTE;
  const base = Number(cotizacion?.min);
  if (base > 0) {
    const raw = Math.round((base * PCT) / 1000) * 1000;
    return Math.min(Math.max(raw, MIN), MAX);
  }
  return FIJA_SESION;
}