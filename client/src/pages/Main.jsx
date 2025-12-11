import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, Heading, IconButton, Text, Button, Stack, Dialog, Portal, Field, Input, Textarea, NativeSelect, CloseButton } from "@chakra-ui/react";
import { FiSettings, FiBell, FiNavigation, FiHeart } from "react-icons/fi";
import { toaster } from "../components/ui/toaster";
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link as RouterLink } from "react-router-dom";
import { useApi } from "../Context/ApiContext";
import { useLocationContext } from "../Context/LocationContext";
import { useSocket } from "../Context/SocketContext";
import "./main-map.css";

function Main() {
  const { auth, authRequest, setSession } = useApi();
  const { location, locationError, refreshLocation, heading } = useLocationContext();
  const { socket } = useSocket();
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [activeEmergencyId, setActiveEmergencyId] = useState(null);
  const [nearbyEmergencies, setNearbyEmergencies] = useState([]);
  const [isMedicalDialogOpen, setIsMedicalDialogOpen] = useState(false);
  const [isSavingMedical, setIsSavingMedical] = useState(false);
  const [medicalData, setMedicalData] = useState({
    medical: [],
    skills: []
  });
  const mapRef = useRef(null);
  const displayName = auth?.user?.name || auth?.user?.fullName || auth?.user?.username || "User";
  const mapCenter = location ? [location.lat, location.lng] : [51.505, -0.09];

  // Initialize medical data from auth
  useEffect(() => {
    if (auth?.user) {
      setMedicalData({
        medical: auth.user.medical || [],
        skills: auth.user.skills || []
      });
    }
  }, [auth?.user]);

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
        <circle cx="${size/2}" cy="${size/2}" r="8" fill="#3182ce" stroke="#fff" stroke-width="2"/>
        <polygon 
          points="${size/2},${size/2} ${size/2 + coneLength * Math.sin((angle - 90) * Math.PI / 180)},${size/2 - coneLength * Math.cos((angle - 90) * Math.PI / 180)} ${size/2 + 8 * Math.sin((angle - 90) * Math.PI / 180)},${size/2 - 8 * Math.cos((angle - 90) * Math.PI / 180)}" 
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
      iconAnchor: [size/2, size/2],
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

  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.width = video.videoWidth;
          video.height = video.videoHeight;
          resolve();
        };
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Stop the video stream
      stream.getTracks().forEach(track => track.stop());
      
      // Convert to base64
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      return base64Image;
    } catch (error) {
      console.error('Error capturing photo:', error);
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
      toaster.error({ status: "error", title: "Location unavailable", description: "We need your location before raising an emergency." });
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
    
    // Capture photo before sending emergency
    const imageBase64 = await capturePhoto();
    
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
      toaster.warning({
        status: "warning",
        title: "Emergency nearby",
        description: `Someone needs help ${distance}.`,
      });
    };
    const cancelHandler = (payload) => {
      if (!payload?.emergencyId) return;
      setNearbyEmergencies((prev) => prev.filter((em) => em.emergencyId !== payload.emergencyId));
    };
    socket.on("emergency:nearby", handler);
    socket.on("emergency:cancelled", cancelHandler);
    return () => {
      socket.off("emergency:nearby", handler);
      socket.off("emergency:cancelled", cancelHandler);
    };
  }, [socket]);

  const handleAddMedical = () => {
    setMedicalData(prev => ({
      ...prev,
      medical: [...prev.medical, { condition: "", treatment: "", remarks: "" }]
    }));
  };

  const handleRemoveMedical = (index) => {
    setMedicalData(prev => ({
      ...prev,
      medical: prev.medical.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateMedical = (index, field, value) => {
    setMedicalData(prev => ({
      ...prev,
      medical: prev.medical.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleAddSkill = () => {
    setMedicalData(prev => ({
      ...prev,
      skills: [...prev.skills, { name: "", level: "adequate" }]
    }));
  };

  const handleRemoveSkill = (index) => {
    setMedicalData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateSkill = (index, field, value) => {
    setMedicalData(prev => ({
      ...prev,
      skills: prev.skills.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSaveMedical = async () => {
    setIsSavingMedical(true);
    try {
      const response = await authRequest("PUT", "/user/medical", {
        medical: medicalData.medical.filter(m => m.condition.trim() !== ""),
        skills: medicalData.skills.filter(s => s.name.trim() !== "")
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
                <Marker position={[location.lat, location.lng]} icon={userIcon}>
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
                </Marker>
              ) : (
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
            </>
          )}
          {activeEmergencyId && location && (
            <Marker position={[location.lat, location.lng]} icon={pulseIcon} interactive={false} />
          )}
          {nearbyEmergencies.map((em) => (
            <Marker key={em.emergencyId} position={[em.latitude, em.longitude]} icon={dangerPulseIcon}>
              <Popup>
                <Stack spacing={2} maxW="300px">
                  <Heading size="sm">{em.requester?.name || em.requester?.username || "Emergency"}</Heading>
                  <Text fontSize="sm" color="gray.700">
                    Distance: {em.distance ? `${Math.round(em.distance)}m` : "nearby"}
                  </Text>
                  {em.image && (
                    <Box>
                      <Text fontWeight="semibold" mb={2}>Emergency Image</Text>
                      <Box
                        as="img"
                        src={em.image}
                        alt="Emergency situation"
                        maxW="100%"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="gray.200"
                      />
                    </Box>
                  )}
                  <Box>
                    <Text fontWeight="semibold">Phone</Text>
                    <Text fontSize="sm">{em.requester?.phoneNumber || "N/A"}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="semibold">Medical</Text>
                    {em.requester?.medical?.length ? (
                      em.requester.medical.map((item, idx) => (
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
                    {em.requester?.skills?.length ? (
                      em.requester.skills.map((skill, idx) => (
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
            </Marker>
          ))}
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
          <IconButton 
            aria-label="Medical Information" 
            variant="ghost" 
            color="white" 
            _hover={{ bg: "whiteAlpha.200" }}
            onClick={() => setIsMedicalDialogOpen(true)}
          >
            <FiHeart />
          </IconButton>
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
          colorPalette={activeEmergencyId ? "orange" : "red"}
          shadow="lg"
          fontWeight="bold"
          onClick={handleEmergencyPress}
          isLoading={isSendingSOS}
        >
          {activeEmergencyId ? "PRESS TO CANCEL" : "EMERGENCY PRESS HERE"}
        </Button>
      </Box>

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
                      <Button size="sm" onClick={handleAddMedical}>Add Condition</Button>
                    </Flex>
                    <Stack gap="4">
                      {medicalData.medical.map((item, index) => (
                        <Box key={index} p="4" borderWidth="1px" borderRadius="md">
                          <Flex justify="flex-end" mb="2">
                            <IconButton 
                              size="sm" 
                              variant="ghost" 
                              colorPalette="red"
                              onClick={() => handleRemoveMedical(index)}
                            >
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
                        <Text color="gray.500" fontSize="sm">No medical conditions added yet.</Text>
                      )}
                    </Stack>
                  </Box>

                  <Box>
                    <Flex justify="space-between" align="center" mb="4">
                      <Heading size="sm">Skills</Heading>
                      <Button size="sm" onClick={handleAddSkill}>Add Skill</Button>
                    </Flex>
                    <Stack gap="4">
                      {medicalData.skills.map((skill, index) => (
                        <Box key={index} p="4" borderWidth="1px" borderRadius="md">
                          <Flex justify="flex-end" mb="2">
                            <IconButton 
                              size="sm" 
                              variant="ghost" 
                              colorPalette="red"
                              onClick={() => handleRemoveSkill(index)}
                            >
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
                        <Text color="gray.500" fontSize="sm">No skills added yet.</Text>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.ActionTrigger>
                <Button 
                  colorPalette="blue" 
                  onClick={handleSaveMedical}
                  isLoading={isSavingMedical}
                >
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
