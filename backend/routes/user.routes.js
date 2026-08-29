import express from "express";
import { auth, authorizeRoles } from "../middleware/auth.js";
import {
  createUser, loginUser, verifyUser,
  getUsers, getProfile, editUser, deleteUser,
} from "../controllers/user.controller.js";

const router = express.Router();

// ─── Públicas ─────────────────────────────────────────────
router.post("/register", createUser);
router.post("/login", loginUser);

// ─── Autenticadas ─────────────────────────────────────────
router.get("/verify", auth, verifyUser);
router.get("/user/:id", auth, getProfile);
router.put("/user/:id", auth, editUser);

// ─── Solo admin ───────────────────────────────────────────
router.get("/users", auth, authorizeRoles("admin"), getUsers);
router.delete("/user/:id", auth, authorizeRoles("admin"), deleteUser);

export default router;
