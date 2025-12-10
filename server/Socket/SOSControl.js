const mongoose = require("mongoose");
const User = require("../Models/user");

// Keep track of sockets that want to receive emergency alerts
const emergencySubscribers = new Map(); // userId -> Set<socketId>
const socketToUser = new Map(); // socketId -> userId

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validateCoords(latitude, longitude) {
  return typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude);
}

// Basic haversine distance in meters
function distanceInMeters(a, b) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const aVal = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

async function expireEmergency(userId, emergencyId, delayMs) {
  setTimeout(async () => {
    try {
      await User.updateOne(
        { _id: userId, "emergencies._id": emergencyId, "emergencies.isActive": true },
        { $set: { "emergencies.$.isActive": false } }
      );
    } catch (err) {
      console.error("Failed to expire emergency", err);
    }
  }, delayMs);
}

function registerSOSHandlers(io) {
  io.on("connection", (socket) => {
    const userId = socket.user?.id;
    if (!userId) return;
    socketToUser.set(socket.id, userId);

    socket.on("emergency:subscribe", () => {
      if (!emergencySubscribers.has(userId)) {
        emergencySubscribers.set(userId, new Set());
      }
      emergencySubscribers.get(userId).add(socket.id);
    });

    socket.on("emergency:unsubscribe", () => {
      emergencySubscribers.get(userId)?.delete(socket.id);
    });

    socket.on("emergency:raise", async (payload = {}, ack) => {
      const latitude = toNumber(payload.latitude);
      const longitude = toNumber(payload.longitude);
      if (!validateCoords(latitude, longitude)) {
        ack?.({ status: "error", message: "Latitude and longitude are required" });
        return;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
      const emergencyId = new mongoose.Types.ObjectId();
      const emergency = { _id: emergencyId, isActive: true, createdAt: now, expiresAt };

      try {
        await User.findByIdAndUpdate(
          userId,
          {
            $push: { emergencies: emergency },
            $set: { "location.latitude": latitude, "location.longitude": longitude },
          },
          { new: false }
        );

        // Automatically expire this emergency after 10 minutes
        expireEmergency(userId, emergencyId, expiresAt.getTime() - now.getTime());

        // Notify nearby subscribers (5 km radius)
        const others = await User.find({
          _id: { $ne: userId },
          "location.latitude": { $ne: null },
          "location.longitude": { $ne: null },
        }).select(["location.latitude", "location.longitude"]);

        const origin = { latitude, longitude };
        const requester = await User.findById(userId).select([
          "name",
          "username",
          "phoneNumber",
          "medical",
          "skills",
          "location.latitude",
          "location.longitude",
        ]);

        others.forEach((user) => {
          const loc = {
            latitude: toNumber(user.location?.latitude),
            longitude: toNumber(user.location?.longitude),
          };
          if (!validateCoords(loc.latitude, loc.longitude)) return;
          const distance = distanceInMeters(origin, loc);
          if (distance <= 5000) {
            const subscriberSockets = emergencySubscribers.get(String(user._id));
            subscriberSockets?.forEach((socketId) => {
              io.to(socketId).emit("emergency:nearby", {
                emergencyId,
                userId,
                latitude,
                longitude,
                expiresAt,
                distance,
                requester: requester
                  ? {
                      id: requester._id,
                      name: requester.name,
                      username: requester.username,
                      phoneNumber: requester.phoneNumber,
                      medical: requester.medical,
                      skills: requester.skills,
                    }
                  : null,
              });
            });
          }
        });

        ack?.({ status: "ok", expiresAt, emergencyId });
      } catch (error) {
        console.error("Failed to handle emergency raise", error);
        ack?.({ status: "error", message: "Failed to save emergency" });
      }
    });

    socket.on("emergency:cancel", async (payload = {}, ack) => {
      const { emergencyId } = payload;
      if (!emergencyId) {
        ack?.({ status: "error", message: "emergencyId is required" });
        return;
      }
      try {
        const result = await User.updateOne(
          { _id: userId, "emergencies._id": emergencyId },
          { $set: { "emergencies.$.isActive": false } }
        );
        if (result.modifiedCount === 0) {
          ack?.({ status: "error", message: "Emergency not found" });
          return;
        }

        // Notify all subscribers so they can remove the cancelled emergency
        emergencySubscribers.forEach((subscriberSockets) => {
          subscriberSockets?.forEach((socketId) => {
            io.to(socketId).emit("emergency:cancelled", { emergencyId, userId });
          });
        });

        ack?.({ status: "ok" });
      } catch (err) {
        console.error("Failed to cancel emergency", err);
        ack?.({ status: "error", message: "Failed to cancel emergency" });
      }
    });

    socket.on("disconnect", () => {
      emergencySubscribers.get(userId)?.delete(socket.id);
      socketToUser.delete(socket.id);
    });
  });
}

module.exports = { registerSOSHandlers };