const express = require("express");
const { authenticateToken } = require("../Helper/authenticateToken");
const router = express.Router();
const UserSchema = require("../Models/user");

router.get("/", authenticateToken, async (req, res) => {
  const { UID } = req.user;
  try {
    const currentUser = await UserSchema.findOne({ UID });
    res.status(200).json(currentUser.settings);
  } catch (err) {
    res.status(500).json({ type: "error", message: "Something went wrong!" });
  }
});



module.exports = router;
