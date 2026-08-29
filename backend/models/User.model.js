import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

/**
 * Roles disponibles en Ink Haus:
 *  - cliente    → usuario público que agenda citas
 *  - artista    → ve su agenda y sube portafolio
 *  - admin      → gestiona artistas, precios y reportes
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minLength: 2 },
    lastname: { type: String, trim: true, default: "" },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/, "Email inválido"],
    },
    phone: { type: String, trim: true, default: "" },
    password: { type: String, required: true, minLength: 8 },
    roles: {
      type: [String],
      enum: ["cliente", "artista", "admin"],
      default: ["cliente"],
    },
    // ── Campos exclusivos de artistas ──────────────────────
    bio: { type: String, default: "", trim: true },
    instagram: { type: String, default: "", trim: true },
    especialidad: { type: String, default: "", trim: true },
    foto_url: { type: String, default: "" },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Hash password antes de guardar ───────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Comparar password ────────────────────────────────────
userSchema.methods.compararPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// ─── Generar JWT ──────────────────────────────────────────
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, name: this.name, roles: this.roles },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
};

export default mongoose.model("User", userSchema);
