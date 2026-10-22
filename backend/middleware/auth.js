import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

// ─── Verificar token JWT ───────────────────────────────────
// Además de validar la firma, consulta al usuario en la base para que:
//  - un usuario eliminado o desactivado pierda el acceso de inmediato
//  - los roles sean siempre los actuales (no los del momento del login)
export const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Token no proporcionado" });
  }

  let payload;
  try {
    payload = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch {
    return res.status(401).json({ success: false, message: "Token inválido o expirado" });
  }

  try {
    const user = await User.findById(payload.id).select("name roles activo");
    if (!user || user.activo === false) {
      return res.status(401).json({ success: false, message: "Sesión no válida" });
    }
    req.auth = { id: user._id.toString(), name: user.name, roles: user.roles };
    next();
  } catch (error) {
    next(error);
  }
};

// ─── Verificar roles ──────────────────────────────────────
export const authorizeRoles = (...roles) => (req, res, next) => {
  const userRoles = req.auth?.roles || [];
  if (!roles.some((r) => userRoles.includes(r))) {
    return res.status(403).json({
      success: false,
      message: `Acceso denegado. Roles requeridos: ${roles.join(", ")}`,
    });
  }
  next();
};