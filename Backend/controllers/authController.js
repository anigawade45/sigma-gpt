import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const ACCESS_TOKEN_EXPIRES = "15m";
const REFRESH_TOKEN_EXPIRES = "7d";
const SALT_ROUNDS = 10;

const generateAccessToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email and password are required" });

    if (password.length < 6)
      return res.status(400).json({ error: "password must be at least 6 characters" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new User({ name, email, password: hashed });
    await user.save();

    return res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokens.push(refreshToken);
    await user.save();

    return res.status(200).json({
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });

    // Remove refresh token from any user that has it
    const user = await User.findOne({ refreshTokens: refreshToken });
    if (user) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      await user.save();
    }

    return res.status(200).json({ message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });

    // verify refresh token
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, payload) => {
      if (err) return res.status(403).json({ error: "Invalid refresh token" });

      const userId = payload.id;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Ensure the refresh token exists for this user
      if (!user.refreshTokens.includes(refreshToken)) {
        return res.status(403).json({ error: "Refresh token revoked" });
      }

      // Rotate: remove the old refresh token and add a new one
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      const newRefresh = generateRefreshToken(user);
      user.refreshTokens.push(newRefresh);
      await user.save();

      const newAccess = generateAccessToken(user);
      return res.status(200).json({ accessToken: newAccess, refreshToken: newRefresh });
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};