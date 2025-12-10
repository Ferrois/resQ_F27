const User = require("../Models/user");

function validateLocation(payload = {}) {
  const { latitude, longitude } = payload;
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function registerLocationHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`Location socket connected: ${socket.id} user=${socket.user?.id}`);

    socket.on("location:update", async (payload = {}, ack) => {
      console.log(payload);
      if (!validateLocation(payload)) {
        ack?.({ status: "error", message: "Invalid location payload" });
        return;
      }

      try {
        await User.findByIdAndUpdate(
          socket.user.id,
          {
            $set: {
              "location.latitude": payload.latitude,
              "location.longitude": payload.longitude,
            },
          },
          { new: false }
        );
        ack?.({ status: "ok" });
      } catch (error) {
        console.error("Failed to persist location", error);
        ack?.({ status: "error", message: "Failed to save location" });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`Location socket disconnected: ${socket.id} (${reason})`);
    });
  });
}

module.exports = { registerLocationHandlers };
