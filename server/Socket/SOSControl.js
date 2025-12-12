const mongoose = require("mongoose");
const User = require("../Models/user");
const { findNearestAEDs } = require("./AEDHelper");
const { sendNotificationToUsers } = require("../PushNotifications/pushService");
const { assessEmergencyWithGroq } = require("../ai_assess");

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

// Send all still-active nearby emergencies to a specific user (e.g. on subscribe)
async function sendActiveEmergenciesToUser(userId, io, targetSocketId) {
  try {
    const subscriber = await User.findById(userId).select(["location.latitude", "location.longitude"]);
    const origin = {
      latitude: toNumber(subscriber?.location?.latitude),
      longitude: toNumber(subscriber?.location?.longitude),
    };
    if (!validateCoords(origin.latitude, origin.longitude)) {
      return;
    }

    const now = new Date();
    const responders = await User.find({
      _id: { $ne: userId },
      "location.latitude": { $ne: null },
      "location.longitude": { $ne: null },
      emergencies: { $elemMatch: { isActive: true, expiresAt: { $gt: now } } },
    }).select([
      "name",
      "username",
      "phoneNumber",
      "medical",
      "skills",
      "location.latitude",
      "location.longitude",
      "emergencies",
    ]);

    responders.forEach((user) => {
      const loc = {
        latitude: toNumber(user.location?.latitude),
        longitude: toNumber(user.location?.longitude),
      };
      if (!validateCoords(loc.latitude, loc.longitude)) return;

      const distance = distanceInMeters(origin, loc);
      if (distance > 500000) return;

      const nearestAEDs = findNearestAEDs(loc.latitude, loc.longitude, 5);
      const requester = user
        ? {
            id: user._id,
            name: user.name,
            username: user.username,
            phoneNumber: user.phoneNumber,
            medical: user.medical,
            skills: user.skills,
          }
        : null;

      user.emergencies
        ?.filter((emergency) => emergency.isActive && emergency.expiresAt > now)
        .forEach((emergency) => {
          const payload = {
            emergencyId: emergency._id,
            userId: user._id,
            latitude: loc.latitude,
            longitude: loc.longitude,
            expiresAt: emergency.expiresAt,
            distance,
            image: emergency.Image || null,
            nearestAEDs,
            aiSummary: emergency.aiSummary || null,
            requester,
          };
          console.log(payload)

          const sockets = targetSocketId ? [targetSocketId] : Array.from(emergencySubscribers.get(String(userId)) || []);
          sockets.forEach((socketId) => io.to(socketId).emit("emergency:nearby", payload));
        });
    });
  } catch (err) {
    console.error("Failed to send active emergencies to user", err);
  }
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
      // When a user subscribes, send them any currently active nearby emergencies
      sendActiveEmergenciesToUser(userId, io, socket.id);
    });

    socket.on("emergency:unsubscribe", () => {
      emergencySubscribers.get(userId)?.delete(socket.id);
    });

    socket.on("emergency:raise", async (payload = {}, ack) => {
      console.log("Raising Emergency");
      const latitude = toNumber(payload.latitude);
      const longitude = toNumber(payload.longitude);
      if (!validateCoords(latitude, longitude)) {
        ack?.({ status: "error", message: "Latitude and longitude are required" });
        return;
      }

      // Cancel any existing active emergencies for this user before creating a new one
      try {
        const userWithEmergencies = await User.findById(userId).select(["emergencies", "username", "name"]);
        const activeEmergencyIds = userWithEmergencies?.emergencies?.filter((em) => em.isActive).map((em) => em._id) || [];

        if (activeEmergencyIds.length > 0) {
          await User.updateOne(
            { _id: userId },
            { $set: { "emergencies.$[em].isActive": false } },
            { arrayFilters: [{ "em.isActive": true }] }
          );

          const cancellingUsername = userWithEmergencies?.username || userWithEmergencies?.name || userId;
          console.log(`Existing emergencies cancelled for ${cancellingUsername}: ${activeEmergencyIds.join(",")}`);

          // Notify subscribers that previous emergencies have been cancelled
          emergencySubscribers.forEach((subscriberSockets) => {
            subscriberSockets?.forEach((socketId) => {
              activeEmergencyIds.forEach((cancelledId) => {
                io.to(socketId).emit("emergency:cancelled", { emergencyId: cancelledId, userId });
              });
            });
          });
        }
      } catch (err) {
        console.error("Failed to cancel existing emergencies before raising a new one", err);
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
      const emergencyId = new mongoose.Types.ObjectId();
      const emergency = {
        _id: emergencyId,
        isActive: true,
        createdAt: now,
        expiresAt,
        Image: payload.image || null,
      };

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

        // Find nearest 5 AEDs from emergency location
        const nearestAEDs = findNearestAEDs(latitude, longitude, 5);

        // Notify nearby subscribers (500 km radius)
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

        // Run AI assessment (image + requester medical history) if configured
        let aiSummary = null;
        if (process.env.GROQ_API_KEY) {
          try {
            aiSummary = await assessEmergencyWithGroq(payload.image || "", requester?.medical || [], process.env.GROQ_API_KEY);
          } catch (err) {
            console.error("AI assessment failed:", err.message);
            aiSummary = {
              condition: "Unavailable",
              severity: "Unknown",
              reasoning: "AI service unavailable.",
              action: "Proceed with standard protocol.",
              location: "Unknown",
            };
          }
        } else {
          aiSummary = {
            condition: "Not configured",
            severity: "Unknown",
            reasoning: "GROQ_API_KEY not set on server.",
            action: "Proceed with standard protocol.",
            location: "Unknown",
          };
        }

        // Update the emergency in the database with AI summary
        await User.updateOne({ _id: userId, "emergencies._id": emergencyId }, { $set: { "emergencies.$.aiSummary": aiSummary } });

        // Collect nearby user IDs for push notifications
        const nearbyUserIds = [];

        others.forEach((user) => {
          const loc = {
            latitude: toNumber(user.location?.latitude),
            longitude: toNumber(user.location?.longitude),
          };
          if (!validateCoords(loc.latitude, loc.longitude)) return;
          const distance = distanceInMeters(origin, loc);
          if (distance <= 500000) {
            nearbyUserIds.push(user._id);
            const subscriberSockets = emergencySubscribers.get(String(user._id));
            subscriberSockets?.forEach((socketId) => {
              io.to(socketId).emit("emergency:nearby", {
                emergencyId,
                userId,
                latitude,
                longitude,
                expiresAt,
                distance,
                image: emergency.Image || null,
                nearestAEDs: nearestAEDs,
                aiSummary,
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

        // Log event without exposing location data
        const requesterUsername = requester?.username || requester?.name || userId;
        console.log(`Emergency called by ${requesterUsername}`);

        // Send push notifications to nearby responders
        if (nearbyUserIds.length > 0) {
          const distanceText = requester?.name || requester?.username || "Someone";
          sendNotificationToUsers(nearbyUserIds, {
            title: "Emergency Alert",
            body: `${distanceText} needs help nearby. Open the app to view details.`,
            icon: "/vite.svg",
            badge: "/vite.svg",
            data: {
              emergencyId: emergencyId.toString(),
              userId: userId.toString(),
              latitude,
              longitude,
            },
            requireInteraction: true,
          }).catch((err) => {
            console.error("Failed to send push notifications:", err);
          });
        }

        // Send acknowledgment to the client who raised the emergency, including nearest AEDs
        ack?.({ status: "ok", expiresAt, emergencyId, nearestAEDs: nearestAEDs, aiSummary });
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

        const cancellingUser = await User.findById(userId).select("username name");
        const cancellingUsername = cancellingUser?.username || cancellingUser?.name || userId;
        console.log(`Emergency cancelled by ${cancellingUsername} (emergencyId=${emergencyId})`);

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

    socket.on("disconnect", async () => {
      emergencySubscribers.get(userId)?.delete(socket.id);
      socketToUser.delete(socket.id);

      try {
        const userDoc = await User.findById(userId).select("emergencies username name");
        const activeIds = userDoc?.emergencies?.filter((em) => em.isActive)?.map((em) => em._id) || [];

        if (activeIds.length > 0) {
          await User.updateOne(
            { _id: userId },
            { $set: { "emergencies.$[em].isActive": false } },
            { arrayFilters: [{ "em.isActive": true }] }
          );

          const cancellingUsername = userDoc?.username || userDoc?.name || userId;
          console.log(`Socket disconnected; cancelling active emergencies for ${cancellingUsername}: ${activeIds.join(",")}`);

          emergencySubscribers.forEach((subscriberSockets) => {
            subscriberSockets?.forEach((socketId) => {
              activeIds.forEach((cancelledId) => {
                io.to(socketId).emit("emergency:cancelled", { emergencyId: cancelledId, userId });
              });
            });
          });
        }
      } catch (err) {
        console.error("Failed to cancel emergencies on disconnect", err);
      }
    });
  });
}

module.exports = { registerSOSHandlers };
