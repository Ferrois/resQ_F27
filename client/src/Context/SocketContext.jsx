import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useApi } from "./ApiContext";
import { useLocationContext } from "./LocationContext";
import { config } from "../config";

const SocketContext = createContext(null);

const SOCKET_URL = config.SOCKET_URL;

export function SocketProvider({ children }) {
  const { auth } = useApi();
  const { location } = useLocationContext();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Create socket instance whenever the access token changes
  useEffect(() => {
    if (!auth?.accessToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(`${SOCKET_URL}/socket`, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token: auth.accessToken },
    });

    setSocket(socketInstance);
    socketInstance.connect();

    socketInstance.on("connect", () => setIsConnected(true));
    socketInstance.on("disconnect", () => setIsConnected(false));
    socketInstance.on("connect_error", (err) => {
      console.error("Socket connection error", err);
      setIsConnected(false);
    });

    return () => {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    };
  }, [auth?.accessToken]);

  // Emit location every 5 seconds when connected
  useEffect(() => {
    if (!socket || !isConnected) return undefined;

    const emitLocation = () => {
      if (!location?.lat || !location?.lng) return;
      socket.emit("location:update", {
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy,
      });
    };

    emitLocation();
    const intervalId = setInterval(emitLocation, 5000);
    return () => clearInterval(intervalId);
  }, [socket, isConnected, location]);

  // Subscribe to emergency notifications once connected
  useEffect(() => {
    if (!socket || !isConnected) return undefined;
    socket.emit("emergency:subscribe");
    return () => {
      socket.emit("emergency:unsubscribe");
    };
  }, [socket, isConnected]);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
    }),
    [socket, isConnected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return ctx;
}

