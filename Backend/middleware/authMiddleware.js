import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
        if (!token) return res.status(401).json({ error: "Missing access token" });

        jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
            if (err) return res.status(401).json({ error: "Invalid or expired access token" });
            const user = await User.findById(payload.id).select("-password -refreshTokens");
            if (!user) return res.status(404).json({ error: "User not found" });
            req.user = user;
            next();
        });
    } catch (err) {
        console.error("Auth middleware error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};