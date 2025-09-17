import express from "express";
const router = express.Router();
import { authenticate } from "../middleware/authMiddleware.js";

router.get("/profile", authenticate, (req, res) => {
    // req.user is attached by authenticate middleware
    return res.status(200).json({ user: req.user });
});

export default router;