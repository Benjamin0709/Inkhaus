import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verifica la configuración al iniciar el servidor, sin bloquear el
// arranque si falla (el sitio debe seguir funcionando aunque el correo
// esté mal configurado; solo se pierden las notificaciones por email).
transporter.verify((err) => {
  if (err) console.error("Nodemailer no pudo conectar:", err.message);
  else console.log("Servidor de correo listo (Nodemailer)");
});

export default transporter;