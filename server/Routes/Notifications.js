const express = require("express");
const { authenticateToken } = require("../Helper/authenticateToken");
const UserSchema = require("../Models/user");
const router = express.Router();

router.get("/remove/:notificationId", authenticateToken, async (req, res) => {
  const { UID } = req.user;
  const { notificationId } = req.params;
  try {
    await UserSchema.findOneAndUpdate({ UID }, { $pull: { notifications: { notificationId: notificationId } } });
    const savedUser = await UserSchema.findOne({ UID })
    return res.status(200).json({ type: "success", message: "Notification Removed", notifications : savedUser.notifications });
  } catch (err) {
    return res.status(500).json({ type: "error", message: "Internal Server Error" });
  }
});

router.get("/", authenticateToken, async (req, res) => {
  const { UID } = req.user;
  const currentUser = await UserSchema.findOne({ UID });
  if (!currentUser) return res.status(404).json({ type: "error", message: "Unidentified User" });
  const { notifications } = currentUser;
  res.status(200).json({ notifications, type: "success", message: "Notifications Fetched" });
});

module.exports = router;
