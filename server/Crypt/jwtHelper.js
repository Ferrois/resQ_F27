require("dotenv").config();
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.SECRETKEY;
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || process.env.SECRETREFRESH || process.env.SECRETKEY;

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

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ type: "error", message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// Verify token middleware (for sockets)
function authenticateSocket(socket, next) {
  const token =
    socket?.handshake?.auth?.token ||
    (socket?.handshake?.headers?.authorization || "").replace("Bearer ", "");

  if (!token) {
    return next(new Error("Missing token"));
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return next(new Error("Invalid or expired token"));
    }
    socket.user = user;
    next();
  });
}

module.exports = {
  authenticateToken,
  authenticateSocket,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
