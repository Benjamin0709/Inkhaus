import jwt from "jsonwebtoken";

// ─── Verificar token JWT ───────────────────────────────────
export const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Token no proporcionado" });
    }
    const token = authHeader.split(" ")[1];
    req.auth = jwt.verify(token, process.env.JWT_SECRET); // { id, name, roles }
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token inválido o expirado" });
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
