import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import {
  createUser,
  loginUser,
  verifyUser,
  getUsers,
  getProfile,
  editUser,
  deleteUser,
  updateMe,
} from "../controllers/user.controller.js";

const router = express.Router();

// ─── Rutas públicas ───────────────────────────────────────
router.post("/register", createUser);
router.post("/login", loginUser);

// ─── Rutas del usuario autenticado ────────────────────────
router.get("/verify", auth, verifyUser);
router.put("/me", auth, updateMe);

// ─── Gestión de usuarios: solo administradores ────────────
router.get(
  "/users",
  auth,
  authorizeRoles("admin"),
  getUsers
);

router.get(
  "/user/:id",
  auth,
  authorizeRoles("admin"),
  getProfile
);

router.put(
  "/user/:id",
  auth,
  authorizeRoles("admin"),
  editUser
);

router.delete(
  "/user/:id",
  auth,
  authorizeRoles("admin"),
  deleteUser
);

export default router;
