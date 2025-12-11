import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  IconButton,
  Text,
  Button,
  Stack,
  Dialog,
  Portal,
  Field,
  Input,
  Textarea,
  NativeSelect,
  CloseButton,
  Card,
  Badge,
  Separator,
  HStack,
} from "@chakra-ui/react";
import { FiSettings, FiBell, FiNavigation, FiHeart, FiPhone, FiMapPin, FiInfo } from "react-icons/fi";
import { toaster } from "../components/ui/toaster";
import { MapContainer, TileLayer, CircleMarker, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link as RouterLink } from "react-router-dom";
import { useApi } from "../Context/ApiContext";
import { useLocationContext } from "../Context/LocationContext";
import { useSocket } from "../Context/SocketContext";
import { usePushNotifications } from "../hooks/usePushNotifications";
import ActionGuideDrawer from "../components/app/ActionGuideDrawer";
import "./main-map.css";
import useLocalStorage from "../hooks/useLocalStorage";

function Main() {
  const { auth, authRequest, setSession } = useApi();
  const { location, locationError, refreshLocation, heading } = useLocationContext();
  const { socket } = useSocket();
  const { subscribe, isSupported } = usePushNotifications();
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [activeEmergencyId, setActiveEmergencyId] = useState(null);
  const [nearbyEmergencies, setNearbyEmergencies] = useState([]);
  const [nearestAEDs, setNearestAEDs] = useState([]);
  const [isMedicalDialogOpen, setIsMedicalDialogOpen] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [selectedAED, setSelectedAED] = useState(null);
  const [isUserInfoDialogOpen, setIsUserInfoDialogOpen] = useState(false);
  const [isSavingMedical, setIsSavingMedical] = useState(false);
  const [medicalData, setMedicalData] = useState({
    medical: [],
    skills: [],
  });
  const [allowEmergencyPhoto] = useLocalStorage("allowEmergencyPhoto", true);
  const mapRef = useRef(null);
  const displayName = auth?.user?.name || auth?.user?.fullName || auth?.user?.username || "Not Logged In";
  const mapCenter = location ? [location.lat, location.lng] : [51.505, -0.09];

  // Initialize medical data from auth
  useEffect(() => {
    if (auth?.user) {
      setMedicalData({
        medical: auth.user.medical || [],
        skills: auth.user.skills || [],
      });
    }
  }, [auth?.user]);

  // Auto-subscribe to push notifications on mount if logged in
  useEffect(() => {
    if (auth?.accessToken && isSupported) {
      subscribe().catch((err) => {
        console.error("Failed to subscribe to push notifications:", err);
        // Don't show error to user, just log it
      });
    }
  }, [auth?.accessToken, isSupported, subscribe]);

  // Create user icon with directional cone
  const userIcon = useMemo(() => {
    if (!heading && heading !== 0) {
      // No heading available, use regular circle marker
      return null;
    }

    // Create a cone/arrow pointing in the direction of heading
    const angle = heading || 0;
    const size = 40;
    const coneLength = 20;

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size / 2}" cy="${size / 2}" r="8" fill="#3182ce" stroke="#fff" stroke-width="2"/>
        <polygon 
          points="${size / 2},${size / 2} ${size / 2 + coneLength * Math.sin(((angle - 90) * Math.PI) / 180)},${size / 2 - coneLength * Math.cos(((angle - 90) * Math.PI) / 180)
      } ${size / 2 + 8 * Math.sin(((angle - 90) * Math.PI) / 180)},${size / 2 - 8 * Math.cos(((angle - 90) * Math.PI) / 180)}" 
          fill="#3182ce" 
          stroke="#fff" 
          stroke-width="1"
        />
      </svg>
    `;

    return L.divIcon({
      className: "user-direction-icon",
      html: svg,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }, [heading]);

  const pulseIcon = useMemo(
    () =>
      L.divIcon({
        className: "pulse-wrapper",
        html: '<div class="pulse-ring"></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    []
  );

  const dangerPulseIcon = useMemo(
    () =>
      L.divIcon({
        className: "pulse-wrapper",
        html: '<div class="pulse-ring--danger"></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    []
  );

  const aedIcon = useMemo(
    () =>
      L.divIcon({
        className: "aed-icon",
        html: `
          <div style="
            width: 30px;
            height: 30px;
            background-color: #e53e3e;
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            font-weight: bold;
            color: white;
            font-size: 16px;
          ">AED</div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    []
  );

  useEffect(() => {
    if (location && mapRef.current) {
      // if location is about the same location as the map, dont set
      if (mapRef.current) {
        const map = mapRef.current;
        const currentCenter = map.getCenter();
        // Use a small threshold for latitude/longitude (in degrees)
        const threshold = 2;
        if (
          Math.abs(currentCenter.lat - location.lat) > threshold ||
          Math.abs(currentCenter.lng - location.lng) > threshold
        ) {
          map.setView([location.lat, location.lng], 15);
        }
      }
    }
  }, [location]);

  const recenterOnUser = () => {
    if (location && mapRef.current) {
      mapRef.current.flyTo([location.lat, location.lng], 15);
      return;
    }
    refreshLocation();
  };

  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.width = video.videoWidth;
          video.height = video.videoHeight;
          resolve();
        };
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      // Stop the video stream
      stream.getTracks().forEach((track) => track.stop());

      // Convert to base64
      const base64Image = canvas.toDataURL("image/jpeg", 0.8);
      return base64Image;
    } catch (error) {
      console.error("Error capturing photo:", error);
      toaster.warning({
        status: "warning",
        title: "Camera unavailable",
        description: "Could not capture photo. Emergency will be sent without image.",
      });
      return null;
    }
  };

  const handleEmergencyPress = async () => {
    if (!socket) {
      toaster.error({ status: "error", title: "Not connected", description: "Socket connection not ready yet." });
      return;
    }

    if (!location?.lat || !location?.lng) {
      toaster.error({
        status: "error",
        title: "Location unavailable",
        description: "We need your location before raising an emergency.",
      });
      refreshLocation();
      return;
    }

    // cancel existing
    if (activeEmergencyId) {
      setIsSendingSOS(true);
      socket.emit("emergency:cancel", { emergencyId: activeEmergencyId }, (res) => {
        setIsSendingSOS(false);
        if (res?.status === "ok") {
          setActiveEmergencyId(null);
          setNearestAEDs([]); // Clear AEDs when emergency is cancelled
          toaster.create({
            status: "info",
            title: "Emergency cancelled",
            description: "Your emergency has been cancelled.",
          });
        } else {
          toaster.create({
            status: "error",
            title: "Failed to cancel",
            description: res?.message || "Please try again.",
          });
        }
      });
      return;
    }

    setIsSendingSOS(true);

    // Capture photo before sending emergency (respect user setting and latest storage value)
    const photoAllowed = typeof window !== "undefined"
      ? JSON.parse(window.localStorage.getItem("allowEmergencyPhoto") ?? "true")
      : allowEmergencyPhoto;
    const imageBase64 = photoAllowed ? await capturePhoto() : null;

    socket.emit(
      "emergency:raise",
      {
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.accuracy,
        image: imageBase64,
      },
      (res) => {
        setIsSendingSOS(false);
        if (res?.status === "ok" && res?.emergencyId) {
          setActiveEmergencyId(res.emergencyId);
          // Store nearest AEDs if provided
          if (res?.nearestAEDs && Array.isArray(res.nearestAEDs)) {
            setNearestAEDs(res.nearestAEDs);
          }
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
      setNearbyEmergencies((prev) => {
        const filtered = prev.filter((em) => em.emergencyId !== payload.emergencyId);
        return [...filtered, { ...payload, receivedAt: Date.now() }];
      });
      // If this responder is viewing an emergency, also show AEDs for that emergency
      // (AEDs are included in the payload for responders)
      toaster.warning({
        status: "warning",
        title: "Emergency nearby",
        description: `Someone needs help ${distance}.`,
      });
    };
    const cancelHandler = (payload) => {
      if (!payload?.emergencyId) return;
      setNearbyEmergencies((prev) => prev.filter((em) => em.emergencyId !== payload.emergencyId));
      // Note: We don't clear nearestAEDs here because they're tied to activeEmergencyId, not nearbyEmergencies
    };
    socket.on("emergency:nearby", handler);
    socket.on("emergency:cancelled", cancelHandler);
    return () => {
      socket.off("emergency:nearby", handler);
      socket.off("emergency:cancelled", cancelHandler);
    };
  }, [socket]);

  const handleAddMedical = () => {
    setMedicalData((prev) => ({
      ...prev,
      medical: [...prev.medical, { condition: "", treatment: "", remarks: "" }],
    }));
  };

  const handleRemoveMedical = (index) => {
    setMedicalData((prev) => ({
      ...prev,
      medical: prev.medical.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateMedical = (index, field, value) => {
    setMedicalData((prev) => ({
      ...prev,
      medical: prev.medical.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const handleAddSkill = () => {
    setMedicalData((prev) => ({
      ...prev,
      skills: [...prev.skills, { name: "", level: "adequate" }],
    }));
  };

  const handleRemoveSkill = (index) => {
    setMedicalData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateSkill = (index, field, value) => {
    setMedicalData((prev) => ({
      ...prev,
      skills: prev.skills.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const handleSaveMedical = async () => {
    setIsSavingMedical(true);
    try {
      const response = await authRequest("PUT", "/user/medical", {
        medical: medicalData.medical.filter((m) => m.condition.trim() !== ""),
        skills: medicalData.skills.filter((s) => s.name.trim() !== ""),
      });

      if (response.success) {
        setSession({ ...auth, user: response.data.user });
        setIsMedicalDialogOpen(false);
        toaster.success({
          status: "success",
          title: "Medical information updated",
          description: "Your medical information has been saved successfully.",
        });
      } else {
        toaster.error({
          status: "error",
          title: "Failed to update",
          description: response.error?.message || "Please try again.",
        });
      }
    } catch (error) {
      toaster.error({
        status: "error",
        title: "Error",
        description: "Failed to update medical information.",
      });
    } finally {
      setIsSavingMedical(false);
    }
  };

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
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {location && (
            <>
              {userIcon ? (
                <Marker
                  position={[location.lat, location.lng]}
                  icon={userIcon}
                  eventHandlers={{ click: () => setIsUserInfoDialogOpen(true) }}
                />
              ) : (
                <CircleMarker
                  center={[location.lat, location.lng]}
                  radius={10}
                  pathOptions={{
                    color: "#3182ce",
                    fillColor: "#63b3ed",
                    fillOpacity: 0.8,
                  }}
                  eventHandlers={{ click: () => setIsUserInfoDialogOpen(true) }}
                />
              )}
            </>
          )}
          {activeEmergencyId && location && (
            <Marker position={[location.lat, location.lng]} icon={pulseIcon} interactive={false} />
          )}
          {nearbyEmergencies.map((em) => (
            <Marker
              key={em.emergencyId}
              position={[em.latitude, em.longitude]}
              icon={dangerPulseIcon}
              eventHandlers={{
                click: () => setSelectedEmergency(em),
              }}
            />
          ))}
          {/* Display AEDs for active emergency (user's own emergency) */}
          {activeEmergencyId &&
            nearestAEDs.map((aed, idx) => (
              <Marker
                key={`aed-${idx}`}
                position={[aed.latitude, aed.longitude]}
                icon={aedIcon}
                eventHandlers={{
                  click: () => setSelectedAED(aed),
                }}
              />
            ))}
          {/* Display AEDs for nearby emergencies (for responders) */}
          {nearbyEmergencies.map(
            (em) =>
              em.nearestAEDs &&
              Array.isArray(em.nearestAEDs) &&
              em.nearestAEDs.map((aed, idx) => (
                <Marker
                  key={`aed-${em.emergencyId}-${idx}`}
                  position={[aed.latitude, aed.longitude]}
                  icon={aedIcon}
                  eventHandlers={{
                    click: () => setSelectedAED(aed),
                  }}
                />
              ))
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
          <ActionGuideDrawer
            trigger={
              <Button aria-label="Action Guide" variant="subtle" _hover={{ bg: "whiteAlpha.200" }}>
                <FiInfo />
                {"Safety Guide"}
              </Button>
            }
          />
          <IconButton
            aria-label="Medical Information"
            variant="ghost"
            color="white"
            _hover={{ bg: "whiteAlpha.200" }}
            onClick={() => setIsMedicalDialogOpen(true)}
          >
            <FiHeart />
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
          colorPalette={activeEmergencyId ? "orange" : "red"}
          shadow="lg"
          fontWeight="bold"
          onClick={handleEmergencyPress}
          isLoading={isSendingSOS}
        >
          {activeEmergencyId ? "PRESS TO CANCEL" : "EMERGENCY PRESS HERE"}
        </Button>
      </Box>

      {/* AED Information Message */}
      {(activeEmergencyId && nearestAEDs.length > 0) ||
        nearbyEmergencies.some((em) => em.nearestAEDs && em.nearestAEDs.length > 0) ? (
        <Box
          position="fixed"
          top="80px"
          left="50%"
          transform="translateX(-50%)"
          zIndex="2"
          bg="blue.500"
          color="white"
          px="4"
          py="2"
          borderRadius="md"
          shadow="lg"
          maxW="90%"
        >
          <Text fontSize="sm" fontWeight="medium" textAlign="center">
            Nearest AED locations are marked on the map
          </Text>
        </Box>
      ) : null}

      <Dialog.Root
        open={!!selectedEmergency}
        onOpenChange={(e) => {
          if (!e.open) setSelectedEmergency(null);
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="640px" maxH="80vh" overflowY="auto">
              <Dialog.Header display="flex" justifyContent="space-between" alignItems="center">
                <Dialog.Title>
                  {selectedEmergency?.requester?.name || selectedEmergency?.requester?.username || "Emergency Alert"}
                </Dialog.Title>
                <CloseButton onClick={() => setSelectedEmergency(null)} />
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <HStack gap="2">
                    <Badge colorPalette="red" variant="solid">
                      {selectedEmergency?.distance ? `${Math.round(selectedEmergency.distance)}m away` : "Nearby"}
                    </Badge>
                  </HStack>

                  {selectedEmergency?.image && (
                    <Box>
                      <Text fontWeight="semibold" mb="2" fontSize="sm" color="gray.600">
                        Emergency Image
                      </Text>
                      <Box
                        as="img"
                        src={selectedEmergency.image}
                        alt="Emergency situation"
                        w="100%"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="gray.200"
                        objectFit="cover"
                        maxH="240px"
                      />
                    </Box>
                  )}

                  <Box>
                    <HStack mb="2" gap="2">
                      <FiPhone size="16" />
                      <Text fontWeight="semibold" fontSize="sm">
                        Contact
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="gray.300" pl="6">
                      {selectedEmergency?.requester?.phoneNumber || "N/A"}
                    </Text>
                  </Box>

                  {selectedEmergency?.aiSummary && (
                    <Box>
                      <HStack mb="3" gap="2">
                        <FiInfo size="16" />
                        <Text fontWeight="semibold" fontSize="sm">
                          AI Summary
                        </Text>
                      </HStack>
                      <Card.Root variant="subtle" size="sm">
                        <Card.Body gap="2" py="2">
                          <Text fontWeight="medium" fontSize="sm">
                            Condition: {selectedEmergency.aiSummary.condition || "Unclear"}
                          </Text>
                          <Badge colorPalette="purple" variant="subtle" alignSelf="flex-start">
                            Severity: {selectedEmergency.aiSummary.severity || "Unknown"}
                          </Badge>
                          <Text fontSize="sm" color="gray.300">
                            Reasoning: {selectedEmergency.aiSummary.reasoning || "No details provided."}
                          </Text>
                          <Separator />
                          <Text fontSize="sm" fontWeight="medium">
                            Suggested Action
                          </Text>
                          <Text fontSize="sm" color="gray.300">
                            {selectedEmergency.aiSummary.action || "Proceed with standard protocol."}
                          </Text>
                        </Card.Body>
                      </Card.Root>
                    </Box>
                  )}

                  {selectedEmergency?.requester?.medical?.length > 0 && (
                    <Box>
                      <HStack mb="3" gap="2">
                        <FiHeart size="16" />
                        <Text fontWeight="semibold" fontSize="sm">
                          Medical History
                        </Text>
                      </HStack>
                      <Stack gap="2">
                        {selectedEmergency.requester.medical.map((item, idx) => (
                          <Card.Root key={idx} variant="subtle" size="sm">
                            <Card.Body gap="2" py="2">
                              <Text fontWeight="medium" fontSize="sm">
                                {item.condition}
                              </Text>
                              {item.treatment && (
                                <Text fontSize="xs" color="gray.600" mt="1">
                                  Treatment: {item.treatment}
                                </Text>
                              )}
                              {item.remarks && (
                                <Text fontSize="xs" color="gray.500" mt="1" fontStyle="italic">
                                  {item.remarks}
                                </Text>
                              )}
                            </Card.Body>
                          </Card.Root>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {selectedEmergency?.requester?.skills?.length > 0 && (
                    <Box>
                      <HStack mb="3" gap="2">
                        <FiInfo size="16" />
                        <Text fontWeight="semibold" fontSize="sm">
                          Skills
                        </Text>
                      </HStack>
                      <Flex wrap="wrap" gap="2">
                        {selectedEmergency.requester.skills.map((skill, idx) => (
                          <Badge
                            key={idx}
                            colorPalette={
                              skill.level === "professional" ? "green" : skill.level === "proficient" ? "blue" : "gray"
                            }
                            variant="subtle"
                          >
                            {skill.name} ({skill.level})
                          </Badge>
                        ))}
                      </Flex>
                    </Box>
                  )}
                </Stack>
              </Dialog.Body>
              <Dialog.Footer justify="flex-end">
                <Button onClick={() => setSelectedEmergency(null)}>Close</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Dialog.Root open={isUserInfoDialogOpen} onOpenChange={(e) => setIsUserInfoDialogOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="480px" maxH="70vh" overflowY="auto">
              <Dialog.Header display="flex" justifyContent="space-between" alignItems="center">
                <Dialog.Title>{displayName}</Dialog.Title>
                <CloseButton onClick={() => setIsUserInfoDialogOpen(false)} />
              </Dialog.Header>
              <Dialog.Body>
                <Stack spacing="4">
                  <Text fontSize="sm" color="gray.700">
                    Accuracy: {location?.accuracy ? `${Math.round(location.accuracy)}m` : "n/a"}
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
              </Dialog.Body>
              <Dialog.Footer justify="flex-end">
                <Button onClick={() => setIsUserInfoDialogOpen(false)}>Close</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Dialog.Root
        open={!!selectedAED}
        onOpenChange={(e) => {
          if (!e.open) setSelectedAED(null);
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="520px" maxH="75vh" overflowY="auto">
              <Dialog.Header display="flex" justifyContent="space-between" alignItems="center">
                <Dialog.Title>AED Location</Dialog.Title>
                <CloseButton onClick={() => setSelectedAED(null)} />
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <HStack gap="2" align="center">
                    <Box
                      w="8"
                      h="8"
                      borderRadius="full"
                      bg="red.500"
                      color="white"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontWeight="bold"
                      fontSize="xs"
                    >
                      AED
                    </Box>
                    <Heading size="sm">AED Location</Heading>
                  </HStack>
                  <Badge colorPalette="red" variant="solid" alignSelf="flex-start">
                    {selectedAED?.distance ? `${Math.round(selectedAED.distance)}m away` : "Nearby"}
                  </Badge>

                  <Box>
                    <HStack mb="2" gap="2">
                      <FiMapPin size="16" />
                      <Text fontWeight="semibold" fontSize="sm">
                        Location Details
                      </Text>
                    </HStack>
                    <Card.Root variant="subtle" size="sm">
                      <Card.Body gap="2" py="2">
                        <Box>
                          <Text fontSize="xs" color="gray.600" fontWeight="medium">
                            Description
                          </Text>
                          <Text fontSize="sm" mt="1">
                            {selectedAED?.description || "No description provided"}
                          </Text>
                        </Box>
                        <Separator />
                        <HStack justify="space-between">
                          <Box>
                            <Text fontSize="xs" color="gray.600" fontWeight="medium">
                              Floor Level
                            </Text>
                            <Badge colorPalette="blue" variant="subtle" mt="1">
                              {selectedAED?.floorLevel || "N/A"}
                            </Badge>
                          </Box>
                        </HStack>
                        {selectedAED?.buildingName && (
                          <>
                            <Separator />
                            <Box>
                              <Text fontSize="xs" color="gray.600" fontWeight="medium">
                                Building
                              </Text>
                              <Text fontSize="sm" mt="1">
                                {selectedAED.buildingName}
                              </Text>
                            </Box>
                          </>
                        )}
                        {selectedAED?.roadName && (
                          <>
                            <Separator />
                            <Box>
                              <Text fontSize="xs" color="gray.600" fontWeight="medium">
                                Address
                              </Text>
                              <Text fontSize="sm" mt="1">
                                {selectedAED.houseNumber ? `${selectedAED.houseNumber} ` : ""}
                                {selectedAED.roadName}
                              </Text>
                            </Box>
                          </>
                        )}
                      </Card.Body>
                    </Card.Root>
                  </Box>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer justify="flex-end">
                <Button onClick={() => setSelectedAED(null)}>Close</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Dialog.Root open={isMedicalDialogOpen} onOpenChange={(e) => setIsMedicalDialogOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="600px" maxH="80vh" overflowY="auto">
              <Dialog.Header>
                <Dialog.Title>Medical Information & Skills</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="6">
                  <Box>
                    <Flex justify="space-between" align="center" mb="4">
                      <Heading size="sm">Medical Conditions</Heading>
                      <Button size="sm" onClick={handleAddMedical}>
                        Add Condition
                      </Button>
                    </Flex>
                    <Stack gap="4">
                      {medicalData.medical.map((item, index) => (
                        <Box key={index} p="4" borderWidth="1px" borderRadius="md">
                          <Flex justify="flex-end" mb="2">
                            <IconButton size="sm" variant="ghost" colorPalette="red" onClick={() => handleRemoveMedical(index)}>
                              ×
                            </IconButton>
                          </Flex>
                          <Stack gap="3">
                            <Field.Root>
                              <Field.Label>Condition</Field.Label>
                              <Input
                                value={item.condition}
                                onChange={(e) => handleUpdateMedical(index, "condition", e.target.value)}
                                placeholder="e.g., Diabetes, Asthma"
                              />
                            </Field.Root>
                            <Field.Root>
                              <Field.Label>Treatment</Field.Label>
                              <Input
                                value={item.treatment || ""}
                                onChange={(e) => handleUpdateMedical(index, "treatment", e.target.value)}
                                placeholder="e.g., Insulin, Inhaler"
                              />
                            </Field.Root>
                            <Field.Root>
                              <Field.Label>Remarks</Field.Label>
                              <Textarea
                                value={item.remarks || ""}
                                onChange={(e) => handleUpdateMedical(index, "remarks", e.target.value)}
                                placeholder="Additional notes"
                              />
                            </Field.Root>
                          </Stack>
                        </Box>
                      ))}
                      {medicalData.medical.length === 0 && (
                        <Text color="gray.500" fontSize="sm">
                          No medical conditions added yet.
                        </Text>
                      )}
                    </Stack>
                  </Box>

                  <Box>
                    <Flex justify="space-between" align="center" mb="4">
                      <Heading size="sm">Skills</Heading>
                      <Button size="sm" onClick={handleAddSkill}>
                        Add Skill
                      </Button>
                    </Flex>
                    <Stack gap="4">
                      {medicalData.skills.map((skill, index) => (
                        <Box key={index} p="4" borderWidth="1px" borderRadius="md">
                          <Flex justify="flex-end" mb="2">
                            <IconButton size="sm" variant="ghost" colorPalette="red" onClick={() => handleRemoveSkill(index)}>
                              ×
                            </IconButton>
                          </Flex>
                          <Stack gap="3">
                            <Field.Root>
                              <Field.Label>Skill Name</Field.Label>
                              <Input
                                value={skill.name}
                                onChange={(e) => handleUpdateSkill(index, "name", e.target.value)}
                                placeholder="e.g., First Aid, CPR"
                              />
                            </Field.Root>
                            <Field.Root>
                              <Field.Label>Level</Field.Label>
                              <NativeSelect.Root>
                                <NativeSelect.Field
                                  value={skill.level}
                                  onChange={(e) => handleUpdateSkill(index, "level", e.target.value)}
                                >
                                  <option value="adequate">Adequate</option>
                                  <option value="proficient">Proficient</option>
                                  <option value="professional">Professional</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                              </NativeSelect.Root>
                            </Field.Root>
                          </Stack>
                        </Box>
                      ))}
                      {medicalData.skills.length === 0 && (
                        <Text color="gray.500" fontSize="sm">
                          No skills added yet.
                        </Text>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.ActionTrigger>
                <Button colorPalette="blue" onClick={handleSaveMedical} isLoading={isSavingMedical}>
                  Save
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
}

export default Main;
