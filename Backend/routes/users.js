import express from "express";
import User from "../models/User.js";
import { protect, allowRoles } from "../middleware/auth.js";

const router = express.Router();

router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
});

router.get("/", protect, allowRoles("admin", "moderator"), async (_req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
});

router.patch("/:id/role", protect, allowRoles("admin"), async (req, res) => {
  const { role } = req.body;
  if (!["user", "moderator", "admin"].includes(role)) return res.status(400).json({ message: "Invalid role" });
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

export default router;
