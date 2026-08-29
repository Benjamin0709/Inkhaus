import User from "../models/User.model.js";

// ─── REGISTER ─────────────────────────────────────────────
export const createUser = async (req, res) => {
  try {
    const { email } = req.body;
    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: "El email ya está registrado" });
    }
    const user = new User(req.body);       // password se hashea en pre("save")
    await user.save();
    res.status(201).json({
      success: true,
      message: "Cuenta creada correctamente",
      token: user.generateToken(),
      user: { id: user._id, name: user.name, email: user.email, roles: user.roles },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── LOGIN ────────────────────────────────────────────────
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email y contraseña son obligatorios" });
    }
    const user = await User.findOne({ email });
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
