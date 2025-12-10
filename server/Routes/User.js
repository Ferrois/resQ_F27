const express = require("express");
const router = express.Router();
const UserSchema = require("../Models/user");
const { encryptPassword, comparePassword } = require("../Crypt/auth");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  authenticateToken,
} = require("../Crypt/jwtHelper");

function formatUserResponse(user) {
  return {
    id: user._id,
    username: user.username,
    name: user.name,
    birthday: user.birthday,
    phoneNumber: user.phoneNumber,
    address: user.address,
    location: user.location,
    medical: user.medical,
    skills: user.skills,
    dependencies: user.dependencies,
    gender: user.gender,
  };
}

router.post("/register", async (req, res) => {
  console.log(req.body)
  const { username, name, birthday, phoneNumber, address, medical, skills, dependencies, gender, password, location } = req.body;
  
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
      location: location && typeof location === "object" ? {
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
      } : undefined,
      medical: medical || [],
      skills: skills || [],
      dependencies: dependencies || []
    });
    await user.save();
    const payload = { id: user._id, username: user.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      type: "success",
      message: "User successfully created",
      accessToken,
      refreshToken,
      user: formatUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ type: "error", message: error.message });
  }
});

// Login user and issue tokens
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ type: "error", message: "Username and password are required" });
  }

  try {
    const user = await UserSchema.findOne({ username });
    if (!user) {
      return res.status(401).json({ type: "error", message: "Invalid credentials username" });
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ type: "error", message: "Invalid credentials password" });
    }

    const payload = { id: user._id, username: user.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      type: "success",
      message: "Login successful",
      accessToken,
      refreshToken,
      user: formatUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ type: "error", message: error.message });
  }
});

// Refresh tokens
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ type: "error", message: "Refresh token is required" });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await UserSchema.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ type: "error", message: "User not found" });
    }

    const payload = { id: user._id, username: user.username };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.json({
      type: "success",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: formatUserResponse(user),
    });
  } catch (error) {
    res.status(401).json({ type: "error", message: "Invalid refresh token" });
  }
});

// Example protected route to fetch current user
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await UserSchema.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ type: "error", message: "User not found" });
    }
    res.json({ type: "success", user: formatUserResponse(user) });
  } catch (error) {
    res.status(500).json({ type: "error", message: error.message });
  }
});

module.exports = router;
