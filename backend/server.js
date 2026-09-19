import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database.js";
import userRoutes from "./routes/user.routes.js";
import artistRoutes from "./routes/artist.routes.js";
import portfolioRoutes from "./routes/portfolio.routes.js";
import pricingRoutes from "./routes/pricing.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import styleRoutes from "./routes/style.routes.js";                        
import uploadRoutes from "./routes/upload.routes.js"; 
import path from "path";                          
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// ─── Middlewares ───────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Rutas ─────────────────────────────────────────────────
app.use("/api", userRoutes);
app.use("/api", artistRoutes);
app.use("/api", portfolioRoutes);
app.use("/api", pricingRoutes);
app.use("/api", appointmentRoutes);
app.use("/api", styleRoutes);
app.use("/api", uploadRoutes);

//imágenes subidas
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
// ─── Health check ──────────────────────────────────────────
app.get("/", (_, res) => res.json({ message: "Ink Haus API funcionando", status: "ok" }));

// ─── 404 ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: "Ruta no encontrada" }));

// ─── Error global ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Error interno del servidor" });
});


// ─── Iniciar ───────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
});
