require("dotenv").config();
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.SECRETKEY;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.SECRETREFRESH || process.env.SECRETKEY;

// Token TTLs
const ACCESS_TOKEN_EXPIRY = "30m";
const REFRESH_TOKEN_EXPIRY = "3d";

function generateAccessToken(payload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ type: "error", message: "Access token missing" });
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ type: "error", message: "Invalid or expired token" });
    }

    // Check lastLogin against database for single device enforcement
    try {
      const User = require("../Models/user");
      const user = await User.findById(decoded.id).select("lastLogin");

      if (!user) {
        return res.status(404).json({ type: "error", message: "User not found" });
      }

      const tokenLastLogin = decoded.lastLogin ? new Date(decoded.lastLogin) : null;
      const userLastLogin = user.lastLogin ? new Date(user.lastLogin) : null;

      // If both exist and don't match, invalidate the session
      if (tokenLastLogin && userLastLogin && tokenLastLogin.getTime() !== userLastLogin.getTime()) {
        return res.status(401).json({
          type: "error",
          message: "Session invalidated - logged in from another device",
          code: "DEVICE_MISMATCH",
        });
      }

      req.user = decoded;
      next();
    } catch (dbError) {
      console.error("Database error in authenticateToken:", dbError);
      return res.status(500).json({ type: "error", message: "Internal server error" });
    }
  });
}

// Verify token middleware (for sockets)
function authenticateSocket(socket, next) {
  const token = socket?.handshake?.auth?.token || (socket?.handshake?.headers?.authorization || "").replace("Bearer ", "");

  if (!token) {
    return next(new Error("Missing token"));
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, async (err, decoded) => {
    if (err) {
      return next(new Error("Invalid or expired token"));
    }

    // Check lastLogin against database for single device enforcement
    try {
      const User = require("../Models/user");
      const user = await User.findById(decoded.id).select("lastLogin");

      if (!user) {
        return next(new Error("User not found"));
      }

      const tokenLastLogin = decoded.lastLogin ? new Date(decoded.lastLogin) : null;
      const userLastLogin = user.lastLogin ? new Date(user.lastLogin) : null;

      // If both exist and don't match, invalidate the session
      if (tokenLastLogin && userLastLogin && tokenLastLogin.getTime() !== userLastLogin.getTime()) {
        return next(new Error("Session invalidated - logged in from another device"));
      }
      socket.user = decoded;
      next();
    } catch (dbError) {
      console.error("Database error in authenticateSocket:", dbError);
      return next(new Error("Internal server error"));
    }
  });
}

module.exports = {
  authenticateToken,
  authenticateSocket,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
