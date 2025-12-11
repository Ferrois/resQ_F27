import React, { useState, useEffect } from "react";
import { Box, Button, Container, Flex, Heading, Stack, Text, Switch, Card, Separator } from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSettings, FiBell, FiActivity } from "react-icons/fi";
import { useApi } from "../Context/ApiContext";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { toaster } from "../components/ui/toaster";
import useLocalStorage from "../hooks/useLocalStorage";

function Settings() {
  const { logout } = useApi();
  const navigate = useNavigate();
  const { isSupported, isSubscribed, toggle, subscribe } = usePushNotifications();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allowEmergencyPhoto, setAllowEmergencyPhoto] = useLocalStorage("allowEmergencyPhoto", true);
  const [fallDetectionEnabled, setFallDetectionEnabled] = useLocalStorage("fallDetectionEnabled", true);
  const [accelerometerSupported, setAccelerometerSupported] = useState(false);

  useEffect(() => {
    setPushEnabled(isSubscribed);
  }, [isSubscribed]);

  useEffect(() => {
    const hasSensor = typeof window !== "undefined" && ("DeviceMotionEvent" in window || "Accelerometer" in window);
    setAccelerometerSupported(hasSensor);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handlePushToggle = async (enabled) => {
    setIsLoading(true);
    try {
      if (enabled && !isSubscribed) {
        // If enabling and not subscribed, subscribe first
        const result = await subscribe();
        if (result.success) {
          setPushEnabled(true);
          toaster.success({
            status: "success",
            title: "Push notifications enabled",
            description: "You will now receive emergency alerts.",
          });
        } else {
          toaster.error({
            status: "error",
            title: "Failed to enable",
            description: result.error || "Could not enable push notifications.",
          });
        }
      } else {
        // Toggle existing subscription
        const result = await toggle(enabled);
        if (result.success) {
          setPushEnabled(enabled);
          toaster.success({
            status: "success",
            title: enabled ? "Push notifications enabled" : "Push notifications disabled",
            description: enabled ? "You will now receive emergency alerts." : "You will no longer receive push notifications.",
          });
        } else {
          toaster.error({
            status: "error",
            title: "Failed to update",
            description: result.error || "Could not update push notification settings.",
          });
        }
      }
    } catch (error) {
      toaster.error({
        status: "error",
        title: "Error",
        description: "Failed to update push notification settings.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.950" }}>
      <Container maxW="lg" py="10">
        <Flex align="center" gap="3" mb="6">
          <Button as={RouterLink} to="/main" leftIcon={<FiArrowLeft />} variant="ghost">
            Back to home
          </Button>
          <Flex align="center" gap="2">
            <FiSettings />
            <Heading size="md">Settings</Heading>
          </Flex>
        </Flex>

        <Stack spacing="4">
          <Card.Root variant="outline">
            <Card.Header>
              <Flex align="center" gap="2">
                <FiBell />
                <Heading size="sm">Push Notifications</Heading>
              </Flex>
            </Card.Header>
            <Card.Body gap="4">
              <Text color="gray.600" _dark={{ color: "gray.300" }} fontSize="sm">
                Receive push notifications for nearby emergencies even when the app is closed.
              </Text>
              {isSupported ? (
                <Flex justify="space-between" align="center">
                  <Text fontWeight="medium">{pushEnabled ? "Notifications enabled" : "Notifications disabled"}</Text>
                  <Switch.Root
                    checked={pushEnabled}
                    onCheckedChange={(e) => handlePushToggle(e.checked)}
                    disabled={isLoading}
                    colorPalette="blue"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control />
                    <Switch.Label />
                  </Switch.Root>
                </Flex>
              ) : (
                <Text fontSize="sm" color="gray.500">
                  Push notifications are not supported in this browser.
                </Text>
              )}
            </Card.Body>
          </Card.Root>

          <Card.Root variant="outline">
            <Card.Header>
              <Flex align="center" gap="2">
                <FiActivity />
                <Heading size="sm">Fall Detection</Heading>
              </Flex>
            </Card.Header>
            <Card.Body gap="4">
              <Text color="gray.600" _dark={{ color: "gray.300" }} fontSize="sm">
                Detect a sudden drop using your device accelerometer. A safety prompt will appear, and SOS will auto-send
                if you do not respond in time. You can turn this off entirely here.
              </Text>
              {accelerometerSupported ? (
                <Flex justify="space-between" align="center">
                  <Text fontWeight="medium">
                    {fallDetectionEnabled ? "Fall detection enabled" : "Fall detection disabled"}
                  </Text>
                  <Switch.Root
                    checked={fallDetectionEnabled}
                    onCheckedChange={(e) => setFallDetectionEnabled(e.checked)}
                    colorPalette="blue"
                    disabled={!accelerometerSupported}
                  >
                    <Switch.HiddenInput />
                    <Switch.Control />
                    <Switch.Label />
                  </Switch.Root>
                </Flex>
              ) : (
                <Text fontSize="sm" color="gray.500">
                  This device does not expose an accelerometer. Fall detection is unavailable.
                </Text>
              )}
            </Card.Body>
          </Card.Root>

          <Card.Root variant="outline">
            <Card.Header>
              <Heading size="sm">Emergency Photo Capture</Heading>
            </Card.Header>
            <Card.Body gap="4">
              <Text color="gray.600" _dark={{ color: "gray.300" }} fontSize="sm">
                Allow the app to take a photo automatically when you raise an emergency. Photos help AI and responders, but you can opt out.
              </Text>
              <Flex justify="space-between" align="center">
                <Text fontWeight="medium">
                  {allowEmergencyPhoto ? "Photo capture enabled" : "Photo capture disabled"}
                </Text>
                <Switch.Root
                  checked={allowEmergencyPhoto}
                  onCheckedChange={(e) => setAllowEmergencyPhoto(e.checked)}
                  colorPalette="blue"
                >
                  <Switch.HiddenInput />
                  <Switch.Control />
                  <Switch.Label />
                </Switch.Root>
              </Flex>
            </Card.Body>
          </Card.Root>

          <Card.Root variant="outline">
            <Card.Header>
              <Heading size="sm">Account</Heading>
            </Card.Header>
            <Card.Body gap="4">
              <Text color="gray.600" _dark={{ color: "gray.300" }} fontSize="sm">
                Manage your session and sign out of this device.
              </Text>
              <Button colorPalette="red" onClick={handleLogout}>
                Log out
              </Button>
            </Card.Body>
          </Card.Root>
        </Stack>
      </Container>
    </Box>
  );
}

export default Settings;
