import React from "react";
import { Box, Flex, Heading, IconButton, Text, Button } from "@chakra-ui/react";
import { FiSettings, FiBell } from "react-icons/fi";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Link as RouterLink } from "react-router-dom";
import { useApi } from "../Context/ApiContext";

function Main() {
  const { auth } = useApi();
  const displayName =
    auth?.user?.name || auth?.user?.fullName || auth?.user?.username || "User";

  return (
    <Box position="relative" minH="100vh" bg="black">
      <Box position="absolute" inset="0" zIndex="0">
        <MapContainer
          center={[51.505, -0.09]}
          zoom={13}
          style={{ height: "100vh", width: "100%", zIndex: 0 }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </Box>

      <Flex
        position="relative"
        zIndex="2"
        px="4"
        py="3"
        align="center"
        justify="space-between"
        bg="blackAlpha.700"
        color="white"
      >
        <Box>
          <Text fontSize="sm" color="gray.200">
            Welcome back,
          </Text>
          <Heading size="md">{displayName}</Heading>
        </Box>
        <Flex align="center" gap="2">
          <IconButton
            aria-label="Notifications"
            variant="ghost"
            color="white"
            _hover={{ bg: "whiteAlpha.200" }}
            icon={<FiBell />}
          />
          <IconButton
            aria-label="Settings"
            as={RouterLink}
            to="/settings"
            variant="ghost"
            color="white"
            _hover={{ bg: "whiteAlpha.200" }}
            icon={<FiSettings />}
          />
        </Flex>
      </Flex>

      <Box
        position="fixed"
        bottom="24px"
        left="50%"
        transform="translateX(-50%)"
        zIndex="1"
      >
        <Button
          size="lg"
          px="10"
          py="6"
          colorPalette="red"
          shadow="lg"
          fontWeight="bold"
        >
          EMERGENCY PRESS HERE
        </Button>
      </Box>
    </Box>
  );
}

export default Main;
