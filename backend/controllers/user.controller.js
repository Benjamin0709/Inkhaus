import User from "../models/User.model.js";
import { sendWelcomeEmail } from "../services/email.service.js";

// ─── REGISTER ─────────────────────────────────────────────
// Solo se aceptan los campos de un registro público. Los roles NUNCA vienen
// del cliente: toda cuenta nueva es "cliente" (el admin crea artistas aparte).
export const createUser = async (req, res) => {
  try {
    const { name, lastname, phone, password } = req.body;
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (
      typeof name !== "string" || name.trim().length < 2 ||
      !email ||
      typeof password !== "string" || password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: "Nombre, correo y contraseña (mínimo 8 caracteres) son obligatorios",
      });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: "El email ya está registrado" });
    }

    const user = new User({
      name: name.trim(),
      lastname: typeof lastname === "string" ? lastname.trim() : "",
      phone: typeof phone === "string" ? phone.trim() : "",
      email,
      password,
    });
    await user.save();
    sendWelcomeEmail(user.email, user.name).catch(() => {});
    res.status(201).json({
      success: true,
      message: "Cuenta creada correctamente",
      token: user.generateToken(),
      user: { id: user._id, name: user.name, email: user.email, roles: user.roles },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "El email ya está registrado" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "Revisa los datos ingresados (correo o contraseña no válidos)" });
    }
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
};

// ─── LOGIN ────────────────────────────────────────────────
export const loginUser = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    // Solo strings: evita que un objeto (p. ej. {"$ne": ""}) llegue como filtro a MongoDB.
    if (typeof rawEmail !== "string" || typeof password !== "string" || !rawEmail || !password) {
      return res.status(400).json({ success: false, message: "Email y contraseña son obligatorios" });
    }
    const user = await User.findOne({ email: rawEmail.trim().toLowerCase() });
    if (!user || !(await user.compararPassword(password))) {
      return res.status(400).json({ success: false, message: "Credenciales incorrectas" });
    }
    res.json({
      success: true,
      message: "Sesión iniciada",
      token: user.generateToken(),
      user: { id: user._id, name: user.name, email: user.email, roles: user.roles },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── VERIFY TOKEN ─────────────────────────────────────────
export const verifyUser = async (req, res) => {
  try {
    const user = await User.findById(req.auth.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ALL (solo admin) ─────────────────────────────────
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, info: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET PROFILE ──────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── EDIT USER ────────────────────────────────────────────
export const editUser = async (req, res) => {
  try {
    const datos = { ...req.body };
    delete datos.password;  // el password se cambia solo via /change-password
    const user = await User.findByIdAndUpdate(req.params.id, datos, { new: true }).select("-password");
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE USER ──────────────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

 // ─── UPDATE MY PROFILE ───────────────────────────────────
export const updateMe = async (req, res) => {
  try {
    const { name, lastname, phone } = req.body;
    const update = {};

    if (name !== undefined) {
      if (String(name).trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "El nombre debe tener al menos 2 caracteres",
        });
      }

      update.name = String(name).trim();
    }

    if (lastname !== undefined) {
      update.lastname = String(lastname).trim();
    }

    if (phone !== undefined) {
      update.phone = String(phone).trim();
    }

    // Solo permite modificar los campos indicados.
    // No modifica roles, email ni password.
    const user = await User.findByIdAndUpdate(
      req.auth.id,
      update,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    return res.json({
      success: true,
      message: "Perfil actualizado correctamente",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};