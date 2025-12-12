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
const {
  subscribeUser,
  unsubscribeUser,
  togglePushNotifications,
  getPublicVapidKey,
} = require("../PushNotifications/pushService");

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
    // Set lastLogin for new user registration
    const lastLogin = new Date();
    await UserSchema.findByIdAndUpdate(user._id, { lastLogin });
    const payload = { id: user._id, username: user.username, lastLogin: lastLogin.getTime() };
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

    // Update lastLogin timestamp
    const lastLogin = new Date();
    await UserSchema.findByIdAndUpdate(user._id, { lastLogin });

    const payload = { id: user._id, username: user.username, lastLogin: lastLogin.getTime() };
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

    // Check if lastLogin matches (single device enforcement)
    const tokenLastLogin = decoded.lastLogin ? new Date(decoded.lastLogin) : null;
    const userLastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
    
    if (tokenLastLogin && userLastLogin && tokenLastLogin.getTime() !== userLastLogin.getTime()) {
      return res.status(401).json({ 
        type: "error", 
        message: "Session invalidated - logged in from another device",
        code: "DEVICE_MISMATCH"
      });
    }

    // Use the existing lastLogin from token, or keep user's lastLogin
    const lastLogin = tokenLastLogin || userLastLogin || new Date();
    const payload = { id: user._id, username: user.username, lastLogin: lastLogin.getTime() };
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

// Update user medical info and skills
router.put("/medical", authenticateToken, async (req, res) => {
  try {
    const { medical, skills } = req.body;
    const user = await UserSchema.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ type: "error", message: "User not found" });
    }

    if (medical !== undefined) {
      user.medical = medical;
    }
    if (skills !== undefined) {
      user.skills = skills;
    }

    await user.save();
    res.json({ type: "success", message: "Medical information updated", user: formatUserResponse(user) });
  } catch (error) {
    res.status(500).json({ type: "error", message: error.message });
  }
});

// Get public VAPID key
router.get("/push/vapid-key", (req, res) => {
  res.json({ type: "success", publicKey: getPublicVapidKey() });
});

// Subscribe to push notifications
router.post("/push/subscribe", authenticateToken, async (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ type: "error", message: "Invalid subscription data" });
    }

    const result = await subscribeUser(req.user.id, subscription);
    if (result.success) {
      res.json({ type: "success", message: "Subscribed to push notifications" });
    } else {
      res.status(500).json({ type: "error", message: result.error });
    }
  } catch (error) {
    res.status(500).json({ type: "error", message: error.message });
  }
});

// Unsubscribe from push notifications
router.post("/push/unsubscribe", authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const result = await unsubscribeUser(req.user.id, endpoint);
    if (result.success) {
      res.json({ type: "success", message: "Unsubscribed from push notifications" });
    } else {
      res.status(500).json({ type: "error", message: result.error });
    }
  } catch (error) {
    res.status(500).json({ type: "error", message: error.message });
  }
});

// Toggle push notifications
router.put("/push/toggle", authenticateToken, async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ type: "error", message: "enabled must be a boolean" });
    }

    const result = await togglePushNotifications(req.user.id, enabled);
    if (result.success) {
      res.json({ type: "success", message: `Push notifications ${enabled ? "enabled" : "disabled"}` });
    } else {
      res.status(500).json({ type: "error", message: result.error });
    }
  } catch (error) {
    res.status(500).json({ type: "error", message: error.message });
  }
});

module.exports = router;
