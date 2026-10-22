import rateLimit from "express-rate-limit";

const MIN = 60 * 1000;

const make = ({ windowMs, limit, message, ...extra }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
    ...extra,
  });

// Tope general por IP. Es alto a propósito: el chat en vivo consulta la API
// cada 4 s y varios clientes pueden compartir la misma IP (wifi del estudio).
export const apiLimiter = make({
  windowMs: 15 * MIN,
  limit: 1500,
  message: "Demasiadas solicitudes. Intenta de nuevo en unos minutos.",
});

// Solo cuentan los intentos fallidos: un login correcto no consume cupo.
export const loginLimiter = make({
  windowMs: 15 * MIN,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.",
});

export const registerLimiter = make({
  windowMs: 60 * MIN,
  limit: 10,
  message: "Demasiados registros desde esta conexión. Intenta más tarde.",
});

export const passwordResetLimiter = make({
  windowMs: 60 * MIN,
  limit: 5,
  message: "Demasiadas solicitudes de recuperación. Intenta de nuevo en una hora.",
});

export const contactLimiter = make({
  windowMs: 60 * MIN,
  limit: 5,
  message: "Has enviado demasiados mensajes. Intenta de nuevo más tarde.",
});

export const chatbotQueryLimiter = make({
  windowMs: 60 * MIN,
  limit: 30,
  message: "Demasiadas consultas. Intenta de nuevo más tarde.",
});