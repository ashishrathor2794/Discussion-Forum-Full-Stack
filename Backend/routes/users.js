const express = require("express");
const User = require("../models/User");
const { protect, allowRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

router.get(
  "/",
  protect,
  allowRoles("admin", "moderator"),
  async (_req, res) => {
    try {
      const users = await User.find()
        .select("-password")
        .sort({ createdAt: -1 });

      res.json(users);
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.patch(
  "/:id/role",
  protect,
  allowRoles("admin"),
  async (req, res) => {
    try {
      const { role } = req.body;

      if (!["user", "moderator", "admin"].includes(role)) {
        return res.status(400).json({
          message: "Invalid role",
        });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json(user);
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

module.exports = router;