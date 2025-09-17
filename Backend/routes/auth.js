import express from "express";
const router = express.Router();
import { register, login, logout, refreshToken } from "../controllers/authController.js";

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);

export default router;