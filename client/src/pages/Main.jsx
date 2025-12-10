import React, { useEffect, useRef, useState } from "react";
import { Box, Flex, Heading, IconButton, Text, Button, Stack } from "@chakra-ui/react";
import { FiSettings, FiBell, FiNavigation } from "react-icons/fi";
import { toaster } from "../components/ui/toaster";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Link as RouterLink } from "react-router-dom";
import { useApi } from "../Context/ApiContext";
import { useLocationContext } from "../Context/LocationContext";
import { useSocket } from "../Context/SocketContext";

function Main() {
  const { auth } = useApi();
  const { location, locationError, refreshLocation } = useLocationContext();
  const { socket } = useSocket();
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const mapRef = useRef(null);
  const displayName = auth?.user?.name || auth?.user?.fullName || auth?.user?.username || "User";
  const mapCenter = location ? [location.lat, location.lng] : [51.505, -0.09];

  useEffect(() => {
    if (location && mapRef.current) {
      mapRef.current.setView([location.lat, location.lng], 15);
    }
  }, [location]);

  const recenterOnUser = () => {
    if (location && mapRef.current) {
      mapRef.current.flyTo([location.lat, location.lng], 15);
      return;
    }
    refreshLocation();
  };

  const handleEmergencyPress = () => {
    if (!socket) {
      toaster.error({ status: "error", title: "Not connected", description: "Socket connection not ready yet." });
      return;
    }

    if (!location?.lat || !location?.lng) {
      toaster.error({ status: "error", title: "Location unavailable", description: "We need your location before raising an emergency." });
      refreshLocation();
      return;
    }

    setIsSendingSOS(true);
    socket.emit(
      "emergency:raise",
      {
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy,
      },
      (res) => {
        setIsSendingSOS(false);
        if (res?.status === "ok") {
          toaster.success({
            status: "success",
            title: "Emergency sent",
            description: "Nearby responders have been notified.",
          });
        } else {
          toaster.error({
            status: "error",
            title: "Failed to send emergency",
            description: res?.message || "Please try again.",
          });
        }
      }
    );
  };

  useEffect(() => {
    if (!socket) return undefined;
    const handler = (payload) => {
      const distance = payload?.distance ? `${Math.round(payload.distance)}m away` : "nearby";
      toaster.warning({
        status: "warning",
        title: "Emergency nearby",
        description: `Someone needs help ${distance}.`,
      });
    };
    socket.on("emergency:nearby", handler);
    return () => {
      socket.off("emergency:nearby", handler);
    };
  }, [socket]);

  return (
    <Box position="relative" minH="100vh" bg="black">
      <Box position="absolute" inset="0" zIndex="0">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "100vh", width: "100%", zIndex: 0 }}
          zoomControl={false}
          whenReady={(mapInstance) => {
            mapRef.current = mapInstance.target;
          }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {location && (
            <CircleMarker
              center={[location.lat, location.lng]}
              radius={10}
              pathOptions={{
                color: "#3182ce",
                fillColor: "#63b3ed",
                fillOpacity: 0.8,
              }}
            >
              <Popup>
                <Stack spacing={2}>
                  <Heading size="sm">{displayName}</Heading>
                  <Text fontSize="sm" color="gray.700">
                    Accuracy: {location.accuracy ? `${Math.round(location.accuracy)}m` : "n/a"}
                  </Text>
                  <Box>
                    <Text fontWeight="semibold">Medical</Text>
                    {auth?.user?.medical?.length ? (
                      auth.user.medical.map((item, idx) => (
                        <Text key={idx} fontSize="sm">
                          {item.condition}
                          {item.treatment ? ` - ${item.treatment}` : ""}
                        </Text>
                      ))
                    ) : (
                      <Text fontSize="sm" color="gray.600">
                        No medical info
                      </Text>
                    )}
                  </Box>
                  <Box>
                    <Text fontWeight="semibold">Skills</Text>
                    {auth?.user?.skills?.length ? (
                      auth.user.skills.map((skill, idx) => (
                        <Text key={idx} fontSize="sm">
                          {skill.name} ({skill.level})
                        </Text>
                      ))
                    ) : (
                      <Text fontSize="sm" color="gray.600">
                        No skills listed
                      </Text>
                    )}
                  </Box>
                </Stack>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </Box>

      <Flex position="relative" zIndex="2" px="4" py="3" align="center" justify="space-between" bg="blackAlpha.700" color="white">
        <Box>
          <Text fontSize="sm" color="gray.200">
            Welcome back,
          </Text>
          <Heading size="md">{displayName}</Heading>
          {locationError && (
            <Text fontSize="xs" color="red.300">
              {locationError}
            </Text>
          )}
        </Box>
        <Flex align="center" gap="2">
          <IconButton aria-label="Notifications" variant="ghost" color="white" _hover={{ bg: "whiteAlpha.200" }}>
            <FiBell />
          </IconButton>
          <IconButton aria-label="Settings" as={RouterLink} to="/settings" variant="ghost" color="white">
            <FiSettings />
          </IconButton>
        </Flex>
      </Flex>

      <Box position="fixed" bottom="24px" left="16px" zIndex="2">
        <IconButton
          aria-label="Recenter to my location"
          size="lg"
          onClick={recenterOnUser}
          //   isDisabled={!location && locationError}
          colorPalette="blue"
          shadow="md"
          variant="solid"
        >
          <FiNavigation />
        </IconButton>
      </Box>

      <Box position="fixed" bottom="24px" left="50%" transform="translateX(-50%)" zIndex="1">
        <Button
          size="lg"
          px="10"
          py="6"
          colorPalette="red"
          shadow="lg"
          fontWeight="bold"
          onClick={handleEmergencyPress}
          isLoading={isSendingSOS}
        >
          EMERGENCY PRESS HERE
        </Button>
      </Box>
    </Box>
  );
}

export default Main;
