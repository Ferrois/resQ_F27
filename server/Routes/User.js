const express = require("express");
const router = express.Router();
const UserSchema = require("../Models/user");

router.post("/register", async (req, res) => {
  const { username, name, age, phoneNumber, address, location, medical, skills, dependencies } = req.body;

  // If user already exists, Error 1
  const existingUser = await UserSchema.findOne({ username: username });
  if (existingUser) {
    return res.status(400).json({ type: "error", message: "Username already exists" });
  }

  const existingPhoneNumber = await UserSchema.findOne({ phoneNumber: phoneNumber });
  if (existingPhoneNumber) {
    return res.status(400).json({ type: "error", message: "Phone number already exists" });
  }

  try {
    const user = new UserSchema({ username, name, age, phoneNumber, address, location, medical, skills, dependencies });
    await user.save();
    res.status(201).json({type: "success", message: "User successfully created", dev: user});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
