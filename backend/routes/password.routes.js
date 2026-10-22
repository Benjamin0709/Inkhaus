import express from "express";
import crypto from "crypto";
import { auth } from "../middleware/auth.js";
import User from "../models/User.model.js";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "../services/email.service.js";

const router = express.Router();

// ── Solicitar recuperación (público) ────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "El correo es obligatorio" });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    // Respuesta idéntica exista o no el usuario, para no revelar qué
    // correos están registrados (buena práctica de seguridad).
    const genericMsg = "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.";
    if (!user) return res.json({ success: true, message: genericMsg });

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;
    sendPasswordResetEmail(user.email, user.name, resetUrl).catch(() => {});

    res.json({ success: true, message: genericMsg });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Confirmar recuperación con token (público) ──────────────────────
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: "La contraseña debe tener al menos 8 caracteres" });
    }

    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ success: false, message: "El enlace es inválido o ya expiró" });
    }

    user.password = password; // se hashea solo (pre-save hook)
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    sendPasswordChangedEmail(user.email, user.name).catch(() => {});

    res.json({ success: true, message: "Contraseña actualizada. Ya puedes iniciar sesión." });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Cambiar contraseña estando logueado (requiere contraseña actual) ──
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Completa ambos campos" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "La nueva contraseña debe tener al menos 8 caracteres" });
    }

    const user = await User.findById(req.auth.id);
    if (!user || !(await user.compararPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: "La contraseña actual es incorrecta" });
    }

    user.password = newPassword;
    await user.save();

    sendPasswordChangedEmail(user.email, user.name).catch(() => {});

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;