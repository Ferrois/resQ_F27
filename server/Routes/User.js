const express = require("express");
const router = express.Router();
const UserSchema = require("../Models/user");
const { encryptPassword } = require("../Crypt/auth");

router.post("/register", async (req, res) => {
  console.log(req.body)
  const { username, name, birthday, phoneNumber, address, location, medical, skills, dependencies, gender, password } = req.body;
  
  // If user already exists, Error 1
  const existingUser = await UserSchema.findOne({ username: username });
  if (existingUser) {
    return res.status(400).json({ type: "error", message: "Username already exists" });
  }

  const existingPhoneNumber = await UserSchema.findOne({ phoneNumber: phoneNumber });
  if (existingPhoneNumber) {
    return res.status(400).json({ type: "error", message: "Phone number already exists" });
  }

  // Hash the password using the helper function
  let passwordHash;
  try {
    passwordHash = await encryptPassword(password);
  } catch (error) {
    return res.status(500).json({ type: "error", message: "Error hashing password" });
  }

  try {
    const user = new UserSchema({ 
      gender, 
      passwordHash, 
      username, 
      name, 
      birthday: new Date(birthday), 
      phoneNumber, 
      address, 
      location, 
      medical: medical || [], 
      skills: skills || [], 
      dependencies: dependencies || [] 
    });
    await user.save();
    res.status(201).json({type: "success", message: "User successfully created", dev: user});
  } catch (error) {
    res.status(500).json({ type: "error", message: error.message });
  }
});

module.exports = router;
