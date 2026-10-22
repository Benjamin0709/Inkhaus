import "./config/timezone.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import crypto from "crypto";
import connectDB from "./config/database.js";
import userRoutes from "./routes/user.routes.js";
import artistRoutes from "./routes/artist.routes.js";
import portfolioRoutes from "./routes/portfolio.routes.js";
import pricingRoutes from "./routes/pricing.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import styleRoutes from "./routes/style.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import chatbotQueryRoutes from "./routes/chatbotQuery.routes.js";
import passwordRoutes from "./routes/password.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import siteContentRoutes from "./routes/siteContent.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import { enviarRecordatorios, startReminderCron } from "./services/reminderCron.js";
import {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  contactLimiter,
  chatbotQueryLimiter,
} from "./middleware/rateLimit.js";
import { uploadsDir, validateStorageConfig } from "./services/storage.js";

dotenv.config();

// ─── Validación de entorno ─────────────────────────────────
const isProd = process.env.NODE_ENV === "production";
if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en las variables de entorno.");
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  const msg = "JWT_SECRET es demasiado corto (usa al menos 32 caracteres aleatorios).";
  if (isProd) {
    console.error(msg);
    process.exit(1);
  }
  console.warn(`Aviso: ${msg}`);
}
if (isProd) {
  const faltan = ["MONGO_URI", "DB_NAME", "FRONTEND_URL", "BACKEND_URL"].filter((k) => !process.env[k]);
  if (process.env.TBK_ENVIRONMENT === "production") {
    faltan.push(...["TBK_COMMERCE_CODE", "TBK_API_KEY"].filter((k) => !process.env[k]));
  }
  if (faltan.length) {
    console.error(`Faltan variables de entorno: ${faltan.join(", ")}`);
    process.exit(1);
  }
}

validateStorageConfig();

const app = express();
const PORT = process.env.PORT || 8080;

// Detrás de un proxy (Railway, Render, etc.) la IP real viene en X-Forwarded-For;
// sin esto el límite de peticiones vería a todos los usuarios como una sola IP.
if (isProd) app.set("trust proxy", 1);

// ─── Middlewares ───────────────────────────────────────────
// FRONTEND_URL se usa también en correos y en el retorno de Webpay (debe ser una sola URL);
// otros orígenes permitidos (p. ej. la versión con www) van en CORS_ORIGINS, separados por coma.
const origenesPermitidos = [process.env.FRONTEND_URL || "http://localhost:5173", ...(process.env.CORS_ORIGINS || "").split(",")]
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

// "cross-origin" en recursos: el frontend (otro dominio) carga las imágenes de /uploads.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  // Sin Origin (Webpay, curl) pasa; el navegador solo recibe permiso desde orígenes de la lista.
  origin: (origin, cb) => cb(null, !origin || origenesPermitidos.includes(origin)),
  credentials: true,
}));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ─── Límite de peticiones ──────────────────────────────────
app.use("/api", apiLimiter);
app.use("/api/login", loginLimiter);
app.use("/api/register", registerLimiter);
app.use(["/api/forgot-password", "/api/reset-password"], passwordResetLimiter);
app.post("/api/contact", contactLimiter);            // solo el envío público, no el listado admin
app.post("/api/chatbot-queries", chatbotQueryLimiter);

// ─── Rutas ─────────────────────────────────────────────────
app.use("/api", userRoutes);
app.use("/api", artistRoutes);
app.use("/api", portfolioRoutes);
app.use("/api", pricingRoutes);
app.use("/api", appointmentRoutes);
app.use("/api", styleRoutes);
app.use("/api", uploadRoutes);
app.use("/api", chatbotQueryRoutes);
app.use("/api", passwordRoutes);
app.use("/api", contactRoutes);
app.use("/api", conversationRoutes);
app.use("/api", siteContentRoutes);
app.use("/api", paymentRoutes);

// Disparador externo de recordatorios (para hosts que se duermen y no sostienen el cron interno).
app.post("/api/internal/reminders", async (req, res) => {
  const esperado = Buffer.from(process.env.CRON_SECRET || "");
  const recibido = Buffer.from(String(req.get("x-cron-secret") || ""));
  if (!esperado.length || esperado.length !== recibido.length || !crypto.timingSafeEqual(esperado, recibido)) {
    return res.status(401).json({ success: false, message: "No autorizado" });
  }
  try {
    res.json({ success: true, enviados: await enviarRecordatorios() });
  } catch (error) {
    console.error("recordatorios:", error.message);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

// ─── Imágenes subidas (solo modo de almacenamiento local) ──
// Los nombres de archivo son únicos (nunca se reescriben), así que pueden cachearse por mucho tiempo.
app.use("/uploads", express.static(uploadsDir(), { maxAge: "30d", immutable: true }));

// ─── Health check ──────────────────────────────────────────
app.get("/", (_, res) => res.json({ message: "Ink Haus API funcionando", status: "ok" }));

// ─── 404 ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: "Ruta no encontrada" }));

// ─── Error global ──────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "JSON no válido" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "La solicitud es demasiado grande" });
  }
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Error interno del servidor" });
});

// ─── Iniciar ───────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
  startReminderCron();
});